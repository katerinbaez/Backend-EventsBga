const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RoleRequest = sequelize.define('RoleRequest', {
    id: {
      type: DataTypes.STRING,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    rolSolicitado: {
      type: DataTypes.ENUM('Artista', 'GestorEventos'),
      allowNull: false
    },
    justificacion: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING,
      defaultValue: 'Pendiente'
    },
    trayectoriaArtistica: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    portafolio: {
      type: DataTypes.JSON, 
      defaultValue: []
    },
    experienciaGestion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    espacioCultural: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    licencias: {
      type: DataTypes.STRING,
      allowNull: true
    },
    documentos: {
      type: DataTypes.JSON, 
      defaultValue: []
    }
  }, {
    timestamps: true
  });

  module.exports = { RoleRequest };

