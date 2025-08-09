export default (sequelize, DataTypes) => {
  const Message = sequelize.define("Message", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "sent"
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    contactId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: "messages"
  });

  return Message;
};
