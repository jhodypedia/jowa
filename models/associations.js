import User from "./User.js";
import Message from "./Message.js";
import Contact from "./Contact.js";
import Log from "./Log.js";

// User punya banyak Message
User.hasMany(Message, { foreignKey: "userId", onDelete: "CASCADE" });
Message.belongsTo(User, { foreignKey: "userId" });

// User punya banyak Log
User.hasMany(Log, { foreignKey: "userId", onDelete: "CASCADE" });
Log.belongsTo(User, { foreignKey: "userId" });

// User punya banyak Contact
User.hasMany(Contact, { foreignKey: "userId", onDelete: "CASCADE" });
Contact.belongsTo(User, { foreignKey: "userId" });
