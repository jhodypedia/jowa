// controllers/waController.js
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadContentFromMessage,
  delay
} from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import fs from "fs";

export default class WAWrapper {
  constructor(io, db) {
    this.io = io;
    this.db = db;
    this.sock = null;
    this.qr = null;
    this.authPath = process.env.AUTH_FOLDER || "./auth";
  }

  getLastQr() {
    return this.qr;
  }

  async init() {
    try {
      if (!fs.existsSync(this.authPath)) {
        fs.mkdirSync(this.authPath, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
      let version;
      try {
        const v = await fetchLatestBaileysVersion();
        version = v.version;
      } catch (e) {
        version = undefined;
      }

      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: true
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update) => {
        const { qr, connection, lastDisconnect } = update;

        if (qr) {
          try {
            const dataUrl = await qrcode.toDataURL(qr);
            this.qr = dataUrl;
            this.io.emit("qr", dataUrl);
            this.io.emit("wa_state", "disconnected");
          } catch (e) {
            console.error("QR gen fail", e);
          }
        }

        if (connection === "open") {
          console.log("[WA] connected");
          this.qr = null;
          this.io.emit("qr", null);
          this.io.emit("wa_state", "connected");
        }

        if (connection === "close") {
          const last = lastDisconnect?.error;
          const code = last?.output?.statusCode;
          this.io.emit("wa_state", "disconnected");
          console.warn("[WA] connection closed", last?.message || last);
          const shouldReconnect = code !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            console.log("[WA] reconnecting in 3s");
            setTimeout(() => this.init().catch(() => {}), 3000);
          } else {
            console.log("[WA] logged out, remove auth");
            try {
              fs.rmSync(this.authPath, { recursive: true, force: true });
            } catch (e) {}
          }
        }
      });

      // incoming messages
      this.sock.ev.on("messages.upsert", async (m) => {
        try {
          this.io.emit("messages.upsert", m);
          const msgs = m.messages || [];

          for (const msg of msgs) {
            const sender = msg.key.remoteJid || msg.participant || "unknown";
            const receiver = this.sock?.user?.id || "server";
            const text =
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              "";

            // save to DB
            if (this.db?.Message) {
              await this.db.Message.create({
                waId: msg.key?.id || null,
                from: sender,
                to: receiver,
                content: text,
                status: "received",
                message: JSON.stringify(msg.message || {}),
                raw: JSON.stringify(msg || {}),
                timestamp: new Date()
              });
            }

            // emit simplified message
            this.io.emit("incoming-message", { from: sender, text });
          }
        } catch (e) {
          console.error("save incoming err", e);
        }
      });

      // contacts
      this.sock.ev.on("contacts.upsert", async (c) => {
        try {
          for (const ct of c) {
            if (!ct?.id) continue;
            if (this.db?.Contact)
              await this.db.Contact.upsert({
                waId: ct.id,
                name: ct.notify || ct.name || null,
                raw: JSON.stringify(ct)
              });
          }
          this.io.emit("contacts.upsert", c);
        } catch (e) {}
      });

      return this.sock;
    } catch (e) {
      console.error("WA init error", e);
      setTimeout(() => this.init().catch(() => {}), 5000);
      throw e;
    }
  }

  async status() {
    return this.sock?.ws?.readyState === 1 ? "connected" : "disconnected";
  }

  async sendText(jid, text) {
    if (!this.sock) throw new Error("WA not connected");
    const id = jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;
    return this.sock.sendMessage(id, { text });
  }

  async sendMediaFromBuffer(jid, buffer, filename, mimetype, caption = "") {
    if (!this.sock) throw new Error("WA not connected");
    const id = jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;
    const mt = (mimetype || "").toLowerCase();
    if (mt.startsWith("image/"))
      return this.sock.sendMessage(id, {
        image: buffer,
        caption,
        mimetype: mt
      });
    if (mt.startsWith("video/"))
      return this.sock.sendMessage(id, {
        video: buffer,
        caption,
        mimetype: mt
      });
    if (mt.startsWith("audio/"))
      return this.sock.sendMessage(id, { audio: buffer, mimetype: mt });
    return this.sock.sendMessage(id, {
      document: buffer,
      fileName: filename || "file",
      mimetype: mt,
      caption
    });
  }

  async downloadMedia(message) {
    if (!this.sock) throw new Error("WA not connected");
    const media =
      message.message?.imageMessage ||
      message.message?.videoMessage ||
      message.message?.documentMessage ||
      message.message?.audioMessage ||
      message.message?.stickerMessage;
    if (!media) throw new Error("No media");

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
      const id = j.includes("@") ? j : `${j}@s.whatsapp.net`;
      try {
        const r = await this.sock.sendMessage(id, { text });
        results.push({ jid: id, ok: true, id: r.key.id });
      } catch (e) {
        results.push({ jid: id, ok: false, error: String(e) });
      }
      await delay(500);
    }
    return results;
  }

  async logout() {
    try {
      if (this.sock?.logout) await this.sock.logout();
    } catch (e) {}
    try {
      fs.rmSync(this.authPath, { recursive: true, force: true });
    } catch (e) {}
    this.qr = null;
    this.io.emit("wa_state", "disconnected");
    setTimeout(() => this.init().catch(() => {}), 1000);
    return true;
  }
}
