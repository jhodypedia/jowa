import { Sequelize, DataTypes } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";

// Untuk dapatkan __dirname di ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Koneksi ke database
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: false,
  }
);

// Import semua models
import UserModel from "./User.js";
import MessageModel from "./Message.js";
import ContactModel from "./Contact.js";
import LogModel from "./Log.js";

// Definisikan model
const User = UserModel(sequelize, DataTypes);
const Message = MessageModel(sequelize, DataTypes);
const Contact = ContactModel(sequelize, DataTypes);
const Log = LogModel(sequelize, DataTypes);

// Relasi antar model (opsional)
User.hasMany(Message, { foreignKey: "userId" });
Message.belongsTo(User, { foreignKey: "userId" });

Contact.hasMany(Message, { foreignKey: "contactId" });
Message.belongsTo(Contact, { foreignKey: "contactId" });

// Export db object
const db = {
  sequelize,
  Sequelize,
  User,
  Message,
  Contact,
  Log
};

export default db;
