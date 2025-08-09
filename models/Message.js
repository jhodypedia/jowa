// models/message.js
export default (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    chatId: { type: DataTypes.STRING, allowNull: false },
    sender: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.STRING, defaultValue: 'text' }
  }, {
    tableName: 'messages'
  });

  return Message;
};
