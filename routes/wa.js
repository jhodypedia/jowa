// routes/wa.js
import express from "express";
import { verifyToken, isAdmin, requirePremium } from "../middleware/auth.js";

const router = express.Router();

// admin page (full) & member page routes are served as EJS in views folder or public
router.get("/qr", verifyToken, isAdmin, (req, res) => {
  const waWrapper = req.app.locals.waWrapper;
  res.json({ ok:true, qr: waWrapper.getLastQr() });
});

router.post("/logout", verifyToken, isAdmin, async (req, res) => {
  const waWrapper = req.app.locals.waWrapper;
  const ok = await waWrapper.logout();
  res.json({ ok });
});

export default router;
