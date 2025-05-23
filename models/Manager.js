const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Manager = sequelize.define('Manager', {
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
    nombreEspacio: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    direccion: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tipoEspacio: {
        type: DataTypes.STRING,
        allowNull: true
    },
    capacidad: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    horarios: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
            lunes: '',
            martes: '',
            miercoles: '',
            jueves: '',
            viernes: '',
            sabado: '',
            domingo: ''
        }
    },
    contacto: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
            email: '',
            telefono: '',
        }
    },
    isProfileComplete: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

module.exports = { Manager };
