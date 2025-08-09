// controllers/userController.js
import db from "../models/index.js";

export async function listUsers(req, res) {
  try {
    const users = await db.User.findAll({ attributes: ["id","username","email","role","premium","createdAt","updatedAt"] });
    res.json({ ok:true, users });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
}

export async function getUser(req, res) {
  try {
    const u = await db.User.findByPk(req.params.id, { attributes: ["id","username","email","role","premium","createdAt","updatedAt"] });
    if (!u) return res.status(404).json({ ok:false, message: "Not found" });
    res.json({ ok:true, user: u });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
}

export async function updateUser(req, res) {
  try {
    const { username, email, password, role, premium } = req.body;
    const u = await db.User.findByPk(req.params.id);
    if (!u) return res.status(404).json({ ok:false, message: "Not found" });
    if (username) u.username = username;
    if (email) u.email = email;
    if (typeof premium !== "undefined") u.premium = !!premium;
    if (role) u.role = role;
    if (password) u.password = password;
    await u.save();
    res.json({ ok:true, user: { id: u.id, username: u.username, email: u.email, role: u.role, premium: u.premium } });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
}

export async function deleteUser(req, res) {
  try {
    const u = await db.User.findByPk(req.params.id);
    if (!u) return res.status(404).json({ ok:false, message: "Not found" });
    await u.destroy();
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
}
