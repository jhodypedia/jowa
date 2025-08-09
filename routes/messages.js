// routes/messages.js
import express from "express";
import multer from "multer";
import { verifyToken, requirePremium, isAdmin } from "../middleware/auth.js";
import { listMessages, getChatMessages, deleteMessage } from "../controllers/messagesController.js";
import db from "../models/index.js";
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get("/", verifyToken, requirePremium, listMessages);
router.get("/:chatId", verifyToken, requirePremium, getChatMessages);
router.delete("/:id", verifyToken, isAdmin, deleteMessage);

router.post("/send", verifyToken, requirePremium, async (req, res) => {
  try {
    const waWrapper = req.app.locals.waWrapper;
    const { jid, text } = req.body;
    if (!jid || !text) return res.status(400).json({ ok:false, message: "jid & text required" });
    const r = await waWrapper.sendText(jid, text);
    await db.Message.create({ waId: jid, sender: req.user.username, content: text, raw: r, timestamp: new Date() });
    res.json({ ok:true, result: r });
  } catch (e) { console.error("send text", e); res.status(500).json({ ok:false, error: e.message }); }
});

router.post("/sendmedia", verifyToken, requirePremium, upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.body.jid) return res.status(400).json({ ok:false, message: "file & jid required" });
    const waWrapper = req.app.locals.waWrapper;
    const r = await waWrapper.sendMediaFromBuffer(req.body.jid, req.file.buffer, req.file.originalname, req.file.mimetype, req.body.caption || "");
    await db.Message.create({ waId: req.body.jid, sender: req.user.username, content: req.body.caption || "", raw: r, timestamp: new Date() });
    res.json({ ok:true, result: r });
  } catch (e) { console.error("sendmedia", e); res.status(500).json({ ok:false, error: e.message }); }
});

router.post("/download", verifyToken, requirePremium, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ ok:false, message: "message required" });
    const waWrapper = req.app.locals.waWrapper;
    const buffer = await waWrapper.downloadMedia(message);
    res.setHeader("Content-Type", "application/octet-stream");
    return res.send(buffer);
  } catch (e) { console.error("download", e); res.status(500).json({ ok:false, error: e.message }); }
});

export default router;
