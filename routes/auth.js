// routes/auth.js
import express from "express";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const SECRET = process.env.JWT_SECRET || "changemejwtsecret";
const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role='member', premium=false } = req.body;
    if (!username || !email || !password) return res.status(400).json({ ok:false, message: "username,email,password required" });
    const exists = await db.User.findOne({ where: { username } });
    if (exists) return res.status(400).json({ ok:false, message: "Username exists" });
    const user = await db.User.create({ username, email, password, role, premium });
    return res.json({ ok:true, user: { id: user.id, username: user.username, email: user.email, role: user.role, premium: user.premium } });
  } catch (e) { console.error(e); res.status(500).json({ ok:false, error: e.message }); }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ ok:false, message: "username & password required" });
    const user = await db.User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ ok:false, message: "User not found" });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ ok:false, message: "Password wrong" });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, premium: user.premium }, SECRET, { expiresIn: "1d" });
    return res.json({ ok:true, token, user: { id: user.id, username: user.username, email: user.email, role: user.role, premium: user.premium } });
  } catch (e) { console.error(e); res.status(500).json({ ok:false, error: e.message }); }
});

router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ ok:false, message: "Token required" });
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : auth;
    const decoded = jwt.verify(token, SECRET);
    const user = await db.User.findByPk(decoded.id, { attributes: ["id","username","email","role","premium","createdAt","updatedAt"] });
    if (!user) return res.status(404).json({ ok:false, message: "User not found" });
    return res.json({ ok:true, user });
  } catch (e) { console.error(e); return res.status(401).json({ ok:false, message: "Token invalid" }); }
});

export default router;
