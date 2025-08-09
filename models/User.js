import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import sequelize from "../config/database.js";

const User = sequelize.define("User", {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM("admin", "member"), allowNull: false, defaultValue: "member" },
  premium: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: "users",
  timestamps: true
});

User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});
User.beforeUpdate(async (user) => {
  if (user.changed("password")) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.prototype.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default User;
