// controllers/waController.js
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
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
    this.store = null;
  }

  getLastQr() {
    return this.qr;
  }

  async init() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth");
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      syncFullHistory: true,
    });

    // Event koneksi
    this.sock.ev.on("connection.update", async (update) => {
      const { qr, connection, lastDisconnect } = update;

      if (qr) {
        try {
          const qrImage = await qrcode.toDataURL(qr);
          this.qr = qrImage;
          console.log("[WA] QR baru tersedia");
          this.io.emit("qr", qrImage);
        } catch (err) {
          console.error("[WA] Gagal buat QR", err);
        }
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log("[WA] Koneksi putus:", lastDisconnect?.error?.message);
        if (shouldReconnect) {
          console.log("[WA] Reconnect...");
          this.init();
        }
      }

      if (connection === "open") {
        console.log("[WA] Terhubung ke WhatsApp");
        this.qr = null;
        this.io.emit("qr", null);
      }
    });

    // Event pesan masuk
    this.sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type === "notify") {
        for (const msg of messages) {
          const sender = msg.key.remoteJid;
          const text = msg.message?.conversation ||
                       msg.message?.extendedTextMessage?.text ||
                       msg.message?.imageMessage?.caption || "";

          console.log(`[WA] Pesan masuk dari ${sender}: ${text}`);

          // Simpan ke DB jika model tersedia
          if (this.db?.Message) {
            await this.db.Message.create({
              from: sender,
              message: text,
              timestamp: new Date()
            });
          }

          // Kirim notifikasi ke client admin
          this.io.emit("incoming-message", { from: sender, message: text });
        }
      }
    });

    // Simpan kredensial
    this.sock.ev.on("creds.update", saveCreds);
  }

  // Cek status koneksi
  async status() {
    return this.sock?.ws?.readyState === 1 ? "connected" : "disconnected";
  }

  // Kirim pesan teks
  async sendText(jid, text) {
    if (!this.sock) throw new Error("WA belum terhubung");
    const id = jid.includes("@s.whatsapp.net") ? jid : jid + "@s.whatsapp.net";
    return await this.sock.sendMessage(id, { text });
  }

  // Kirim pesan dengan media
  async sendMedia(jid, filePath, caption = "") {
    if (!this.sock) throw new Error("WA belum terhubung");
    const buffer = fs.readFileSync(filePath);
    const id = jid.includes("@s.whatsapp.net") ? jid : jid + "@s.whatsapp.net";
    return await this.sock.sendMessage(id, { image: buffer, caption });
  }

  // Broadcast pesan teks
  async broadcast(jids, text) {
    if (!this.sock) throw new Error("WA belum terhubung");
    const results = [];
    for (const jid of jids) {
      const id = jid.includes("@s.whatsapp.net") ? jid : jid + "@s.whatsapp.net";
      const sent = await this.sock.sendMessage(id, { text });
      results.push({ jid: id, status: "sent", id: sent.key.id });
      await delay(1000); // delay biar aman
    }
    return results;
  }

  // Ambil semua kontak
  async getContacts() {
    if (!this.sock) throw new Error("WA belum terhubung");
    return this.sock.contacts;
  }

  // Ambil semua grup
  async getGroups() {
    if (!this.sock) throw new Error("WA belum terhubung");
    const groups = await this.sock.groupFetchAllParticipating();
    return Object.values(groups);
  }

  // Tandai pesan sebagai dibaca
  async markAsRead(jid, messageId) {
    if (!this.sock) throw new Error("WA belum terhubung");
    const id = jid.includes("@s.whatsapp.net") ? jid : jid + "@s.whatsapp.net";
    return await this.sock.readMessages([{ remoteJid: id, id: messageId }]);
  }

  // Logout
  async logout() {
    if (this.sock) {
      await this.sock.logout();
      this.qr = null;
      console.log("[WA] Logout berhasil");
      return true;
    }
    return false;
  }
}
