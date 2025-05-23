const { RoleRequest } = require('./RoleRequest');
const { User } = require('./User');
const { Notification } = require('./Notification');
const { Artist } = require('./Artist');
const { Manager } = require('./Manager');
const EventRequest = require('./EventRequest');
const Event = require('./Event');
const CulturalSpace = require('./CulturalSpace');

// Establecer la relación entre RoleRequest y User
RoleRequest.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'User'
});

// Establecer la relación entre Artist y User
Artist.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'user'
});

// Establecer la relación entre Manager y User
Manager.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'user'
});

// Establecer la relación entre Notification y User
Notification.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'user'
});

// Establecer relaciones para EventRequest
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

// Establecer relaciones para Event
Event.belongsTo(CulturalSpace, {
    foreignKey: 'spaceId',
    targetKey: 'id',
    as: 'space'
});

// Establecer relación entre Event y Artist
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
