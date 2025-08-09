// models/Message.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Message = sequelize.define("Message", {
  from: { type: DataTypes.STRING, allowNull: false },
  to: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM("sent", "received", "failed"), defaultValue: "sent" }
}, {
  tableName: "messages",
  timestamps: true
});

export default Message;
