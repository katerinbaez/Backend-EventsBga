const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: { type: DataTypes.STRING, primaryKey: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: true },
}, {
    timestamps: true,  // Habilita la gestión automática de createdAt y updatedAt
});

module.exports = { User };
