const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titulo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT
  },
  fechaProgramada: {
    type: DataTypes.DATE,
    allowNull: true
  },
  categoria: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tipoEvento: {
    type: DataTypes.STRING,
    allowNull: true
  },
  asistentesEsperados: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  requerimientosAdicionales: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  managerId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  artistId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Artists',
      key: 'id'
    }
  },
  spaceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'CulturalSpaces',
      key: 'id'
    }
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'aprobado', 'programado', 'cancelado', 'completado'),
    defaultValue: 'pendiente'
  }
}, {
  timestamps: true
});

module.exports = Event;
