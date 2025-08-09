// routes/messages.js
import express from "express";
import { verifyToken, requirePremium } from "../middleware/auth.js";
import db from "../models/index.js";
const router = express.Router();

// kirim teks
router.post("/send", verifyToken, requirePremium, async (req, res) => {
  try {
    const waWrapper = req.app.locals.waWrapper;
    const { jid, text } = req.body;
    if (!jid || !text) return res.status(400).json({ ok:false, message: "jid & text required" });
    const r = await waWrapper.sendText(jid, text);
    await db.Message.create({ waId: jid, sender: req.user.username, content: text, raw: r, timestamp: new Date() });
    res.json({ ok:true, result: r });
  } catch (e) { console.error(e); res.status(500).json({ ok:false, error: e.message }); }
});

// kirim media (multipart/form-data)
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });

router.post("/sendmedia", verifyToken, requirePremium, upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.body.jid) return res.status(400).json({ ok:false, message: "file & jid required" });
    const waWrapper = req.app.locals.waWrapper;
    const buffer = req.file.buffer;
    const mimetype = req.file.mimetype;
    const filename = req.file.originalname;
    const r = await waWrapper.sendMedia(req.body.jid, buffer, filename, mimetype, req.body.caption || "");
    await db.Message.create({ waId: req.body.jid, sender: req.user.username, content: req.body.caption || "", raw: r, timestamp: new Date() });
    res.json({ ok:true, result: r });
  } catch (e) { console.error(e); res.status(500).json({ ok:false, error: e.message }); }
});

// download media from saved message (client passes message object)
router.post("/download", verifyToken, requirePremium, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ ok:false, message: "message required" });
    const waWrapper = req.app.locals.waWrapper;
    const buffer = await waWrapper.downloadMediaFromMessage(message);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buffer);
  } catch (e) { console.error(e); res.status(500).json({ ok:false, error: e.message }); }
});

export default router;
