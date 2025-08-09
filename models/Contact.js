import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Contact = sequelize.define("Contact", {
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false, unique: true }
}, {
  tableName: "contacts",
  timestamps: true
});

export default Contact;
