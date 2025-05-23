const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Artist = sequelize.define('Artist', {
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
    nombreArtistico: {
        type: DataTypes.STRING,
        allowNull: false
    },
    biografia: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fotoPerfil: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL o ruta a la imagen de perfil del artista'
    },
    habilidades: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    portfolio: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
            trabajos: [],
            imagenes: []
        }
    },
    redesSociales: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
            instagram: '',
            facebook: '',
            twitter: '',
            youtube: ''
        }
    },
    contacto: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
            email: '',
            telefono: '',
            ciudad: ''
        }
    },
    isProfileComplete: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

module.exports = { Artist };
