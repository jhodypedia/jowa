// routes/messages.js
import express from "express";
import multer from "multer";
import db from "../models/index.js";
import { verifyToken, requirePremium } from "../middleware/auth.js";
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// get messages (admin only)
router.get("/", verifyToken, async (req, res) => {
  const msgs = await db.Message.findAll({ order:[['createdAt','DESC']], limit: 200 });
  res.json({ ok:true, messages: msgs });
});

// send text
router.post("/send", verifyToken, requirePremium, async (req, res) => {
  try {
    const { jid, text } = req.body;
    const wa = req.app.locals.waWrapper;
    if (!wa) return res.status(500).json({ ok:false, message: "WA not initialized" });
    const r = await wa.sendText(jid, text);
    res.json({ ok:true, result: r });
  } catch (e) { res.status(500).json({ ok:false, error: String(e) }); }
});

// send media
router.post("/sendmedia", verifyToken, requirePremium, upload.single("file"), async (req, res) => {
  try {
    const wa = req.app.locals.waWrapper;
    const jid = req.body.jid;
    if (!req.file || !jid) return res.status(400).json({ ok:false, message: "file & jid required" });
    const r = await wa.sendMediaFromBuffer(jid, req.file.buffer, req.file.originalname, req.file.mimetype || "application/octet-stream", req.body.caption || "");
    res.json({ ok:true, result: r });
  } catch (e) { res.status(500).json({ ok:false, error: String(e) }); }
});

export default router;
