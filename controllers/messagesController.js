// controllers/messagesController.js
import db from "../models/index.js";

export async function listMessages(req, res) {
  try {
    const msgs = await db.Message.findAll({ limit: 200, order: [["timestamp", "DESC"]] });
    res.json({ ok:true, messages: msgs });
  } catch (e) {
    console.error("listMessages err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}

export async function getChatMessages(req, res) {
  try {
    const chatId = req.params.chatId;
    const msgs = await db.Message.findAll({ where: { waId: chatId }, order: [["timestamp", "ASC"]] });
    res.json({ ok:true, messages: msgs });
  } catch (e) {
    console.error("getChatMessages err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}

export async function deleteMessage(req, res) {
  try {
    const id = req.params.id;
    const m = await db.Message.findByPk(id);
    if (!m) return res.status(404).json({ ok:false, message: "Message not found" });
    await m.destroy();
    res.json({ ok:true });
  } catch (e) {
    console.error("deleteMessage err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}
