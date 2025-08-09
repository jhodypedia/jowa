import sequelize from "../config/database.js";
import User from "./User.js";
import Message from "./Message.js";
import Contact from "./Contact.js";
import Log from "./Log.js";
import "./associations.js";

export {
  sequelize,
  User,
  Message,
  Contact,
  Log
};
