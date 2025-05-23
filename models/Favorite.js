const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Favorite = sequelize.define('Favorite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  targetType: {
    type: DataTypes.ENUM('event', 'artist', 'space'),
    allowNull: false
  },
  targetId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['userId', 'targetType', 'targetId']
    }
  ]
});

module.exports = Favorite;
