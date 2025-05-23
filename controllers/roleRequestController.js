const { RoleRequest } = require('../models/RoleRequest');
const { User } = require('../models/User');
const { Notification } = require('../models/Notification');

exports.approveRoleRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;

        const roleRequest = await RoleRequest.findByPk(id);
        
        if (!roleRequest) {
            return res.status(404).json({ message: 'Solicitud de rol no encontrada' });
        }

        if (approved) {
            // Actualizar el estado de la solicitud
            await roleRequest.update({ estado: 'Aprobada' });

            // Convertir el tipo de rol al formato esperado
            const roleType = roleRequest.rolSolicitado === 'Artista' ? 'artist' : 'manager';

            // Crear notificación de aprobación
            const notificationData = {
                userId: roleRequest.userId,
                type: 'roleApproved',
                title: '¡Solicitud Aprobada!',
                message: `¡Tu solicitud de rol como ${roleRequest.rolSolicitado} ha sido aprobada! Ya puedes comenzar a usar las funcionalidades de tu nuevo rol.`,
                data: {
                    roleRequestId: roleRequest.id,
                    roleType: roleType,
                    dismissable: true
                }
            };

            console.log('Intentando crear notificación con datos:', notificationData);

            const notification = await Notification.create(notificationData);

            console.log('Notificación creada:', {
                id: notification.id,
                type: notification.type,
                data: notification.data
            });

            res.json({ message: 'Solicitud aprobada exitosamente' });
        } else {
            // Actualizar el estado de la solicitud a rechazada
            await roleRequest.update({ estado: 'Rechazada' });

            // Convertir el tipo de rol al formato esperado
            const roleType = roleRequest.rolSolicitado === 'Artista' ? 'artist' : 'manager';

            // Crear notificación de rechazo
            const notificationData = {
                userId: roleRequest.userId,
                type: 'roleRejected',
                title: '¡Solicitud Rechazada!',
                message: `Tu solicitud de rol como ${roleRequest.rolSolicitado} ha sido rechazada. Si tienes preguntas, por favor contacta al administrador.`,
                data: {
                    roleRequestId: roleRequest.id,
                    roleType: roleType,
                    dismissable: true
                }
            };

            console.log('Intentando crear notificación con datos:', notificationData);

            const notification = await Notification.create(notificationData);

            console.log('Notificación creada:', {
                id: notification.id,
                type: notification.type,
                data: notification.data
            });

            res.json({ message: 'Solicitud rechazada' });
        }
    } catch (error) {
        console.error('Error al procesar solicitud de rol:', error);
        res.status(500).json({ 
            message: 'Error al procesar la solicitud', 
            error: error.message 
        });
    }
};

exports.getRoleRequests = async (req, res) => {
    try {
        const roleRequests = await RoleRequest.findAll({
            include: [{
                model: User,
                attributes: ['name', 'email']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json(roleRequests);
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ 
            message: 'Error al obtener las solicitudes', 
            error: error.message 
        });
    }
};

exports.createRoleRequest = async (req, res) => {
    try {
        const { userId, roleType, description } = req.body;

        const roleRequest = await RoleRequest.create({
            userId,
            roleType,
            description,
            status: 'pending'
        });

        res.status(201).json(roleRequest);
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({ 
            message: 'Error al crear la solicitud', 
            error: error.message 
        });
    }
};
