const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define('Review', {
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
    type: DataTypes.INTEGER,
    allowNull: false
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = Review;
