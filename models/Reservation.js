const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reservation = sequelize.define('Reservation', {
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
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'confirmada', 'cancelada'),
    defaultValue: 'pendiente'
  },
  codigoReserva: {
    type: DataTypes.STRING,
    unique: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = Reservation;
