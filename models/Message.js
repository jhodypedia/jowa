// models/Message.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Message = sequelize.define("Message", {
  waId: { type: DataTypes.STRING, allowNull: true },
  sender: { type: DataTypes.STRING, allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: true },
  raw: { type: DataTypes.JSON, allowNull: true },
  timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: "messages",
  timestamps: false
});

export default Message;
