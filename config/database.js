// config/database.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "wa_db",
  process.env.DB_USER || "root",
  process.env.DB_PASS || "",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    dialect: "mysql",
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  }
);

export default sequelize;
