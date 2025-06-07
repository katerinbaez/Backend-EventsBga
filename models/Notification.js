const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.STRING,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: true, 
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('data');
            if (typeof rawValue === 'string') {
                try {
                    return JSON.parse(rawValue);
                } catch (e) {
                    return {};
                }
            }
            return rawValue || {};
        }
    },
    isAdminNotification: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: true
});

Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
    });
};

module.exports = { Notification };