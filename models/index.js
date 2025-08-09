// models/index.js
import sequelize from "../config/database.js";
import User from "./User.js";
import Message from "./Message.js";
import Contact from "./Contact.js";
import Log from "./Log.js";

const db = { sequelize, Sequelize: sequelize.Sequelize || require('sequelize'), User, Message, Contact, Log };
export default db;
