const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BlockedSlot = sequelize.define('BlockedSlot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  managerId: {
    type: DataTypes.STRING(255),  
    allowNull: false
  },
  
  hour: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 23
    }
  },
  day: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 6
    },
    comment: 'Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)'
  },
  dayName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nombre del día (Domingo, Lunes, Martes, etc.)'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha específica del bloqueo (YYYY-MM-DD)'
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
 
}, {
  timestamps: true,
  tableName: 'BlockedSlots'
});

module.exports = BlockedSlot;
