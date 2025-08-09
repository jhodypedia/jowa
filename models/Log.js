// models/log.js
export default function(sequelize, DataTypes) {
  return sequelize.define("Log", {
    type: DataTypes.STRING,
    message: DataTypes.TEXT
  });
}
