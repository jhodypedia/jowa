// routes/wa.js
import express from "express";
import { verifyToken, isAdmin, requirePremium } from "../middleware/auth.js";
const router = express.Router();

router.get("/status", verifyToken, async (req, res) => {
  try {
    const waWrapper = req.app.locals.waWrapper;
    const status = await waWrapper.status();
    res.json({ ok:true, status });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

router.get("/qr", verifyToken, isAdmin, (req, res) => {
  const waWrapper = req.app.locals.waWrapper;
  const qr = waWrapper.getLastQr();
  if (!qr) return res.status(404).json({ ok:false, message: "No QR" });
  res.json({ ok:true, qr });
});

router.delete("/logout", verifyToken, isAdmin, async (req, res) => {
  try {
    const waWrapper = req.app.locals.waWrapper;
    const ok = await waWrapper.logout();
    res.json({ ok });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

router.post("/broadcast", verifyToken, requirePremium, async (req, res) => {
  try {
    const { jids, text } = req.body;
    if (!Array.isArray(jids) || !text) return res.status(400).json({ ok:false, message: "jids(array) & text required" });
    const waWrapper = req.app.locals.waWrapper;
    const result = await waWrapper.broadcast(jids, text);
    res.json({ ok:true, result });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

export default router;
