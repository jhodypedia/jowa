// routes/contacts.js
import express from "express";
import { verifyToken } from "../middleware/auth.js";
const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const wa = req.app.locals.waWrapper;
    const contacts = await wa.getContacts();
    res.json({ ok:true, contacts });
  } catch (e) { res.status(500).json({ ok:false, error: String(e) }); }
});

export default router;
