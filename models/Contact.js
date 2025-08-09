// models/Contact.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Contact = sequelize.define("Contact", {
  waId: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: true },
  raw: { type: DataTypes.JSON, allowNull: true }
}, {
  tableName: "contacts",
  timestamps: false
});

export default Contact;
