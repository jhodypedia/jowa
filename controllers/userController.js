// controllers/userController.js
import db from "../models/index.js";

export async function listUsers(req, res) {
  try {
    const users = await db.User.findAll({ attributes: ["id","username","email","role","premium","createdAt","updatedAt"] });
    res.json({ ok:true, users });
  } catch (e) {
    console.error("listUsers err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}

export async function getUser(req, res) {
  try {
    const id = req.params.id;
    if (req.user.role !== "admin" && Number(req.user.id) !== Number(id)) {
      return res.status(403).json({ ok:false, message: "Akses ditolak" });
    }
    const u = await db.User.findByPk(id, { attributes: ["id","username","email","role","premium","createdAt","updatedAt"] });
    if (!u) return res.status(404).json({ ok:false, message: "User tidak ditemukan" });
    res.json({ ok:true, user: u });
  } catch (e) {
    console.error("getUser err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}

export async function createUser(req, res) {
  try {
    const { username, email, password, role = "member", premium = false } = req.body;
    if (!username || !email || !password) return res.status(400).json({ ok:false, message: "username,email,password required" });
    const existing = await db.User.findOne({ where: { username } });
    if (existing) return res.status(400).json({ ok:false, message: "Username sudah ada" });
    const user = await db.User.create({ username, email, password, role, premium });
    res.json({ ok:true, user: { id: user.id, username: user.username, email: user.email, role: user.role, premium: user.premium } });
  } catch (e) {
    console.error("createUser err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}

export async function updateUser(req, res) {
  try {
    const id = req.params.id;
    const u = await db.User.findByPk(id);
    if (!u) return res.status(404).json({ ok:false, message: "User tidak ditemukan" });

    if (req.user.role !== "admin" && Number(req.user.id) !== Number(id)) {
      return res.status(403).json({ ok:false, message: "Akses ditolak" });
    }

    const { username, email, password, role, premium } = req.body;
    if (username) u.username = username;
    if (email) u.email = email;
    if (typeof password !== "undefined" && password) u.password = password;
    if (req.user.role === "admin") {
      if (typeof premium !== "undefined") u.premium = !!premium;
      if (role) u.role = role;
    }
    await u.save();
    res.json({ ok:true, user: { id: u.id, username: u.username, email: u.email, role: u.role, premium: u.premium } });
  } catch (e) {
    console.error("updateUser err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}

export async function deleteUser(req, res) {
  try {
    const id = req.params.id;
    const u = await db.User.findByPk(id);
    if (!u) return res.status(404).json({ ok:false, message: "User tidak ditemukan" });
    await u.destroy();
    res.json({ ok:true });
  } catch (e) {
    console.error("deleteUser err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}
