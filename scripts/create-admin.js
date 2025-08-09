// scripts/create-admin.js
import dotenv from "dotenv";
dotenv.config();
import db from "../models/index.js";

(async () => {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();
    const username = process.env.SEED_ADMIN_USERNAME || "admin";
    const email = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
    const password = process.env.SEED_ADMIN_PASS || "admin123";
    const existing = await db.User.findOne({ where: { username }});
    if (existing) { console.log("Admin exists:", existing.username); process.exit(0); }
    const user = await db.User.create({ username, email, password, role: "admin", premium: true });
    console.log("Admin created:", user.username);
    process.exit(0);
  } catch (e) {
    console.error("Seed error:", e);
    process.exit(1);
  }
})();
