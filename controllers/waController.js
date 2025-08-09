// controllers/waController.js
import baileysPkg from "@whiskeysockets/baileys";
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadContentFromMessage
} = baileysPkg;

import qrcode from "qrcode";
import pino from "pino";
import fs from "fs";
import path from "path";

const AUTH_FOLDER = process.env.AUTH_FOLDER || path.join(process.cwd(), "auth_info");

export default class WAWrapper {
  constructor(io, db) {
    this.io = io;
    this.db = db;
    this.sock = null;
    this.lastQr = null;
    this.isInitializing = false;
    this.logger = pino({ level: "silent" });
  }

  getLastQr() { return this.lastQr; }
  getSocket() { return this.sock; }

  async init() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    try {
      if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

      let version;
      try {
        const v = await fetchLatestBaileysVersion();
        version = v.version;
      } catch (e) {
        version = undefined;
      }

      this.sock = makeWASocket({
        auth: state,
        version,
        logger: this.logger,
        printQRInTerminal: false,
        getMessage: async () => ({})
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update) => {
        this.io.emit("connection.update", update);
        try {
          if (update.qr) {
            try {
              const dataUrl = await qrcode.toDataURL(update.qr, { errorCorrectionLevel: "M" });
              this.lastQr = dataUrl;
              this.io.emit("qr", dataUrl);
            } catch (e) {
              this.io.emit("qr", update.qr);
            }
          }

          if (update.connection === "open") {
            this.lastQr = null;
            this.io.emit("ready");
            await this.db.Log.create({ type: "connection", message: "connected" }).catch(()=>{});
            this.io.emit("log", "WA connected");
          }

          if (update.connection === "close") {
            const last = update.lastDisconnect || {};
            this.io.emit("log", `[WA] closed ${JSON.stringify(last)}`);
            try { await this.db.Log.create({ type: "connection.close", message: JSON.stringify(last) }); } catch(e){}
            try { if (this.sock?.ev) this.sock.ev.removeAllListeners(); } catch(e){}
            this.sock = null;
            const err = last?.error;
            const statusCode = err?.output?.statusCode;
            if (statusCode === 401) {
              try { fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch(e){}
              setTimeout(()=> this.init().catch(()=>{}), 1000);
            } else {
              setTimeout(()=> this.init().catch(()=>{}), 3000);
            }
          }
        } catch (e) {
          console.error("connection.update handler err", e);
        }
      });

      this.sock.ev.on("messages.upsert", async (m) => {
        this.io.emit("messages.upsert", m);
        try {
          const msgs = m.messages || [];
          for (const mm of msgs) {
            const sender = mm.key?.remoteJid || mm.participant || "unknown";
            await this.db.Message.create({
              waId: mm.key?.id || null,
              sender,
              content: JSON.stringify(mm.message || {}),
              raw: mm,
              timestamp: new Date()
            });
          }
        } catch (e) {
          console.error("save incoming msg err", e);
        }
      });

      this.sock.ev.on("contacts.upsert", async (c) => {
        this.io.emit("contacts.upsert", c);
        try {
          for (const ct of c) {
            if (!ct?.id) continue;
            await this.db.Contact.upsert({ waId: ct.id, name: ct.notify || ct.name || null, raw: ct });
          }
        } catch (e) {}
      });

      this.isInitializing = false;
      return this.sock;
    } catch (e) {
      this.isInitializing = false;
      console.error("WA init error:", e);
      setTimeout(()=> this.init().catch(()=>{}), 5000);
      throw e;
    }
  }

  async status() {
    if (!this.sock) return { connected: false };
    return { connected: true };
  }

  async sendText(jid, text) {
    if (!this.sock) throw new Error("WA not connected");
    return this.sock.sendMessage(jid, { text });
  }

  async sendMediaFromBuffer(jid, buffer, filename, mimetype, caption = "") {
    if (!this.sock) throw new Error("WA not connected");
    const mt = (mimetype || "").toLowerCase();
    if (mt.startsWith("image/")) return this.sock.sendMessage(jid, { image: buffer, caption, mimetype: mt });
    if (mt.startsWith("video/")) return this.sock.sendMessage(jid, { video: buffer, caption, mimetype: mt });
    if (mt.startsWith("audio/")) return this.sock.sendMessage(jid, { audio: buffer, mimetype: mt });
    return this.sock.sendMessage(jid, { document: buffer, fileName: filename || "file", mimetype: mt, caption });
  }

  async downloadMedia(message) {
    if (!this.sock) throw new Error("WA not connected");
    const media =
      message.message?.imageMessage ||
      message.message?.videoMessage ||
      message.message?.documentMessage ||
      message.message?.audioMessage ||
      message.message?.stickerMessage;
    if (!media) throw new Error("No media in message");
    let mediaType = "document";
    if (message.message?.imageMessage) mediaType = "image";
    else if (message.message?.videoMessage) mediaType = "video";
    else if (message.message?.audioMessage) mediaType = "audio";
    const stream = await downloadContentFromMessage(media, mediaType);
    const bufs = [];
    for await (const chunk of stream) bufs.push(Buffer.from(chunk));
    return Buffer.concat(bufs);
  }

  async getContacts() {
    if (!this.sock) throw new Error("WA not connected");
    const store = this.sock.store?.contacts || {};
    return Object.values(store);
  }

  async getChats() {
    if (!this.sock) throw new Error("WA not connected");
    const store = this.sock.store?.chats || {};
    return Object.values(store);
  }

  async broadcast(jids = [], text = "") {
    if (!this.sock) throw new Error("WA not connected");
    const results = [];
    for (const j of jids) {
      try {
        const r = await this.sock.sendMessage(j, { text });
        results.push({ jid: j, ok: true, result: r });
      } catch (e) {
        results.push({ jid: j, ok: false, error: String(e) });
      }
    }
    return results;
  }

  async logout() {
    try { if (this.sock?.logout) await this.sock.logout(); } catch(e){}
    try { fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch(e){}
    this.sock = null;
    setTimeout(()=> this.init().catch(()=>{}), 1000);
    return true;
  }
}
