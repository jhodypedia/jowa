// controllers/waController.js
import baileys from "@whiskeysockets/baileys";
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = baileys;
import P from "pino";
import qrcode from "qrcode";
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
    this.logger = P({ level: "silent" });
  }

  getLastQr() { return this.lastQr; }
  getSocket() { return this.sock; }

  async init() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    try {
      if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

      // optional: fetch version
      let version = undefined;
      try {
        const v = await fetchLatestBaileysVersion();
        version = v.version;
      } catch (e) { /* ignore */ }

      this.sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: this.logger,
        getMessage: async () => ({})
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update) => {
        this.io.emit("connection.update", update);
        try { await this.db.Log.create({ type: "connection.update", message: JSON.stringify(update) }); } catch(e){}

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
        }
        if (update.connection === "close") {
          const last = update.lastDisconnect || {};
          this.io.emit("log", `[WA] closed ${JSON.stringify(last)}`);
          try { await this.db.Log.create({ type: "connection.close", message: JSON.stringify(last) }); } catch(e){}
          try { if (this.sock?.ev) this.sock.ev.removeAllListeners(); } catch(e){}
          this.sock = null;
          // if logout (statusCode 401) -> clear auth & wait for fresh login
          const err = last?.error;
          const statusCode = err?.output?.statusCode;
          if (statusCode === 401) {
            try { fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch(e){}
            setTimeout(()=> this.init().catch(()=>{}), 1000);
          } else {
            setTimeout(()=> this.init().catch(()=>{}), 3000);
          }
        }
      });

      // messages.upsert
      this.sock.ev.on("messages.upsert", async (m) => {
        this.io.emit("messages.upsert", m);
        // simpan pesan ke DB
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
            // if message has media, you can auto-download if needed
          }
        } catch (e) { console.error("save message err", e); }
      });

      // contacts.upsert
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

  // --- utility helpers that routes will call ---
  async sendText(jid, text) {
    if (!this.sock) throw new Error("WA not connected");
    return this.sock.sendMessage(jid, { text });
  }

  async sendMedia(jid, bufferOrPath, filename, mimetype, caption = "") {
    if (!this.sock) throw new Error("WA not connected");
    const mt = (mimetype || "").toLowerCase();
    const attach = {};
    if (Buffer.isBuffer(bufferOrPath)) {
      attach.buffer = bufferOrPath;
    } else {
      // path
      attach.path = bufferOrPath;
    }
    if (mt.startsWith("image/")) return this.sock.sendMessage(jid, { image: attach.path ? { url: attach.path } : bufferOrPath, caption, mimetype: mt });
    if (mt.startsWith("video/")) return this.sock.sendMessage(jid, { video: attach.path ? { url: attach.path } : bufferOrPath, caption, mimetype: mt });
    if (mt.startsWith("audio/")) return this.sock.sendMessage(jid, { audio: attach.path ? { url: attach.path } : bufferOrPath, mimetype: mt });
    return this.sock.sendMessage(jid, { document: attach.path ? { url: attach.path } : bufferOrPath, fileName: filename || "file", mimetype: mt, caption });
  }

  async downloadMediaFromMessage(message) {
    if (!this.sock) throw new Error("WA not connected");
    const media = message.message?.imageMessage || message.message?.videoMessage || message.message?.documentMessage || message.message?.audioMessage || message.message?.stickerMessage;
    if (!media) throw new Error("No media in message");
    let mediaType = "document";
    if (message.message?.imageMessage) mediaType = "image";
    else if (message.message?.videoMessage) mediaType = "video";
    else if (message.message?.audioMessage) mediaType = "audio";
    const stream = await downloadContentFromMessage(media, mediaType);
    const bufs = [];
    for await (const chunk of stream) bufs.push(Buffer.from(chunk));
    const buffer = Buffer.concat(bufs);
    return buffer;
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

  async presenceSubscribe(jid) {
    if (!this.sock) throw new Error("WA not connected");
    return this.sock.presenceSubscribe(jid);
  }

  async groupCreate(subject, participants = []) {
    if (!this.sock) throw new Error("WA not connected");
    return this.sock.groupCreate(subject, participants);
  }

  async groupLeave(jid) {
    if (!this.sock) throw new Error("WA not connected");
    return this.sock.groupLeave(jid);
  }

  async profileGet(jid) {
    if (!this.sock) throw new Error("WA not connected");
    return this.sock.profilePictureUrl(jid).catch(()=>null);
  }

  async fetchLatestVersion() {
    try {
      const v = await fetchLatestBaileysVersion();
      return v.version;
    } catch (e) { return null; }
  }

  async logout() {
    try { if (this.sock?.logout) await this.sock.logout(); } catch(e){}
    try { fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch(e){}
    this.sock = null;
    setTimeout(()=> this.init().catch(()=>{}), 1000);
    return true;
  }
}
