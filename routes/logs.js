// routes/logs.js
import express from "express";
import db from "../models/index.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
const router = express.Router();

router.get("/", verifyToken, isAdmin, async (req, res) => {
  const q = req.query.q || '';
  const where = q ? { message: { [db.Sequelize.Op.like]: `%${q}%` } } : undefined;
  const logs = await db.Log.findAll({ where, order:[['createdAt','DESC']], limit: 500 });
  res.json({ ok:true, logs });
});

export default router;
