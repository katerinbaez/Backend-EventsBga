const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventRequest = sequelize.define('EventRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  artistId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  managerId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    references: {
      model: 'Users',
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
  titulo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  horaInicio: {
    type: DataTypes.STRING,
    allowNull: false
  },
  horaFin: {
    type: DataTypes.STRING,
    allowNull: false
  },
  asistentesEsperados: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tipoEvento: {
    type: DataTypes.STRING,
    allowNull: false
  },
  categoria: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'otro'
  },
  requerimientosAdicionales: {
    type: DataTypes.TEXT
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
    defaultValue: 'pendiente'
  },
  rejectionReason: {
    type: DataTypes.TEXT
  }
}, {
  timestamps: true,
  tableName: 'EventRequests'
});

EventRequest.associate = function(models) {
  EventRequest.belongsTo(models.User, {
    foreignKey: 'artistId',
    as: 'artist'
  });
  
  EventRequest.belongsTo(models.User, {
    foreignKey: 'managerId',
    as: 'manager'
  });
  
  EventRequest.belongsTo(models.CulturalSpace, {
    foreignKey: 'spaceId',
    as: 'space'
  });
};

module.exports = EventRequest;
