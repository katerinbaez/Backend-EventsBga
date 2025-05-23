const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventAttendance = sequelize.define('EventAttendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  eventId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Events',
      key: 'id'
    }
  },
  artistId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  artistName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isRegularUser: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  confirmationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('confirmado', 'pendiente', 'cancelado'),
    defaultValue: 'confirmado'
  }
}, {
  timestamps: true
});

module.exports = EventAttendance;
