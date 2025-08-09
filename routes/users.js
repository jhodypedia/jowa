// routes/users.js
import express from "express";
import db from "../models/index.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
const router = express.Router();

router.get("/", verifyToken, isAdmin, async (req, res) => {
  const users = await db.User.findAll({ attributes: ["id","username","email","role","premium","createdAt","updatedAt"] });
  res.json({ ok:true, users });
});

router.get("/:id", verifyToken, isAdmin, async (req, res) => {
  const user = await db.User.findByPk(req.params.id, { attributes: ["id","username","email","role","premium","createdAt","updatedAt"] });
  if (!user) return res.status(404).json({ ok:false, message: "Not found" });
  res.json({ ok:true, user });
});

router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  const user = await db.User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ ok:false, message: "Not found" });
  const { username, email, password, role, premium } = req.body;
  await user.update({ username, email, password, role, premium });
  res.json({ ok:true, user });
});

router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  const user = await db.User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ ok:false, message: "Not found" });
  await user.destroy();
  res.json({ ok:true });
});

export default router;
