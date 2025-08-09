import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Log = sequelize.define("Log", {
  action: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  userId: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: "logs",
  timestamps: true
});

export default Log;
