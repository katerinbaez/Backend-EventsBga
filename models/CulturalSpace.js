const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CulturalSpace = sequelize.define('CulturalSpace', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  managerId: {
    type: DataTypes.STRING, 
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contacto: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
        email: '',
        telefono: '',
    }
},
  capacidad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT
  },
  instalaciones: {
    type: DataTypes.ARRAY(DataTypes.STRING) 
  },
  disponibilidad: {
    type: DataTypes.JSONB 
  },
  
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING)
  },
  redesSociales: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
        facebook: '',
        instagram: '',
        twitter: ''
    }
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: -90,
      max: 90
    }
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: -180,
      max: 180
    }
  }
}, {
  timestamps: true
});

CulturalSpace.associate = (models) => {
  CulturalSpace.hasMany(models.Event, {
    foreignKey: 'spaceId',
    as: 'events'
  });
};

module.exports = CulturalSpace;
