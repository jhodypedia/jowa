// config/database.js
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  process.env.DB_NAME || "mydb", // Nama database
  process.env.DB_USER || "root", // Username database
  process.env.DB_PASS || "",     // Password database
  {
    host: process.env.DB_HOST || "127.0.0.1", // Host database
    dialect: process.env.DB_DIALECT || "mysql", // mysql, postgres, sqlite, dll
    logging: false, // matikan log query SQL di console
    timezone: "+07:00" // contoh: WIB
  }
);

export default sequelize;

// Auto connect & sync models
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected.");

    // Import semua model agar terdaftar di Sequelize
    await import("../models/User.js");
    await import("../models/Message.js");
    await import("../models/Contact.js");
    await import("../models/Log.js");

    // Buat relasi antar model
    await import("../models/associations.js");

    // Sinkronisasi model → tabel di DB
    await sequelize.sync({ alter: true }); 
    console.log("✅ Database synchronized.");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
};
