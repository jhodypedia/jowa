// models/Log.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Log = sequelize.define("Log", {
  type: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: "logs",
  timestamps: false
});

export default Log;
