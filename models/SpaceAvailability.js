const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SpaceAvailability = sequelize.define('SpaceAvailability', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  managerId: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 6
    },
    comment: '0: domingo, 1: lunes, ..., 6: sábado'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha específica de la disponibilidad (YYYY-MM-DD)'
  },
  hourSlots: {
    type: DataTypes.TEXT, 
    allowNull: false,
    defaultValue: '[]',
    field: 'availableHours', 
    get() {
      const value = this.getDataValue('hourSlots');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('hourSlots', JSON.stringify(value));
    }
  }
}, {
  timestamps: true,
  tableName: 'SpaceAvailabilities'
});

module.exports = SpaceAvailability;
