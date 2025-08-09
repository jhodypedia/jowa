// controllers/authController.js
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const SECRET = process.env.JWT_SECRET || "changemejwtsecret";

export async function register(req, res) {
  try {
    const { username, email, password, role = "member", premium = false } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: "username,email,password required" });
    const user = await db.User.create({ username, email, password, role, premium });
    res.json({ ok: true, user: { id: user.id, username: user.username, email: user.email, role: user.role, premium: user.premium }});
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error: e.message });
  }
}

export async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "username & password required" });
    const user = await db.User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ ok:false, message: "User tidak ditemukan" });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ ok:false, message: "Password salah" });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, premium: user.premium }, SECRET, { expiresIn: "1d" });
    res.json({ ok:true, token, user: { id: user.id, username: user.username, email: user.email, role: user.role, premium: user.premium } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error: e.message });
  }
}

export async function me(req, res) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Token required" });
  const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : auth;
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = await db.User.findByPk(decoded.id, { attributes: ["id","username","email","role","premium","createdAt","updatedAt"] });
    res.json({ ok:true, user });
  } catch (e) {
    res.status(401).json({ ok:false, message: "Token invalid" });
  }
}
