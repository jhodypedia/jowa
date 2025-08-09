export default (sequelize, DataTypes) => {
  const Log = sequelize.define("Log", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false
    },
    level: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: "logs"
  });

  return Log;
};
