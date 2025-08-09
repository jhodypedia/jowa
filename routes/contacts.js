// routes/contacts.js
import express from "express";
import { verifyToken, requirePremium } from "../middleware/auth.js";
const router = express.Router();

router.get("/", verifyToken, requirePremium, async (req, res) => {
  try {
    const waWrapper = req.app.locals.waWrapper;
    const contacts = await waWrapper.getContacts();
    res.json({ ok:true, contacts });
  } catch (e) { console.error(e); res.status(500).json({ ok:false, error: e.message }); }
});

export default router;
