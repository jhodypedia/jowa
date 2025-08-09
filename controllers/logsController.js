// controllers/logsController.js
import db from "../models/index.js";

export async function listLogs(req, res) {
  try {
    const q = req.query.q || null;
    const limit = Math.min(Number(req.query.limit) || 200, 2000);
    const where = {};
    if (q) where.message = { [db.Sequelize.Op.like]: `%${q}%` };
    const logs = await db.Log.findAll({ where, order: [["createdAt", "DESC"]], limit });
    res.json({ ok: true, logs });
  } catch (e) {
    console.error("listLogs err", e);
    res.status(500).json({ ok:false, error: e.message });
  }
}
