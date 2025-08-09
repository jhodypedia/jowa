import sequelize from "../config/database.js";
import User from "./User.js";
import Message from "./Message.js";
import Contact from "./Contact.js";
import Log from "./Log.js";
import "./associations.js";

// Gabungkan semua model ke dalam objek db
const db = {};
db.sequelize = sequelize;
db.User = User;
db.Message = Message;
db.Contact = Contact;
db.Log = Log;

export default db;
