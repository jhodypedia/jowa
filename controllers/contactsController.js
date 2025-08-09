// controllers/contactsController.js
import db from "../models/index.js";

export async function listContacts(req, res) {
  try {
    const contacts = await db.Contact.findAll({ order: [["name","ASC"]] });
    res.json({ ok:true, contacts });
  } catch (e) {
    console.error("listContacts err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}

export async function createContact(req, res) {
  try {
    const { waId, name, raw } = req.body;
    if (!waId) return res.status(400).json({ ok:false, message: "waId required" });
    const c = await db.Contact.create({ waId, name, raw });
    res.json({ ok:true, contact: c });
  } catch (e) {
    console.error("createContact err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}

export async function updateContact(req, res) {
  try {
    const id = req.params.id;
    const c = await db.Contact.findByPk(id);
    if (!c) return res.status(404).json({ ok:false, message: "Contact not found" });
    const { name, raw } = req.body;
    if (name) c.name = name;
    if (raw) c.raw = raw;
    await c.save();
    res.json({ ok:true, contact: c });
  } catch (e) {
    console.error("updateContact err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}

export async function deleteContact(req, res) {
  try {
    const id = req.params.id;
    const c = await db.Contact.findByPk(id);
    if (!c) return res.status(404).json({ ok:false, message: "Contact not found" });
    await c.destroy();
    res.json({ ok:true });
  } catch (e) {
    console.error("deleteContact err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}
