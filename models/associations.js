// Definición de relaciones entre modelos
// Establece las asociaciones entre las entidades del sistema

const { RoleRequest } = require('./RoleRequest');
const { User } = require('./User');
const { Notification } = require('./Notification');
const { Artist } = require('./Artist');
const { Manager } = require('./Manager');
const EventRequest = require('./EventRequest');
const Event = require('./Event');
const CulturalSpace = require('./CulturalSpace');

RoleRequest.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'User'
});

Artist.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'user'
});

Manager.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'user'
});

Notification.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'user'
});

EventRequest.belongsTo(User, {
    foreignKey: 'artistId',
    targetKey: 'id',
    as: 'artist'
});

EventRequest.belongsTo(User, {
    foreignKey: 'managerId',
    targetKey: 'id',
    as: 'manager'
});

Event.belongsTo(CulturalSpace, {
    foreignKey: 'spaceId',
    targetKey: 'id',
    as: 'space'
});

Event.belongsTo(Artist, {
    foreignKey: 'artistId',
    targetKey: 'id',
    as: 'artist'
});


module.exports = {
    setupAssociations: () => {
        console.log('✅ Asociaciones establecidas');
    }
};
