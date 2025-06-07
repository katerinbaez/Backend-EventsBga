// Controlador de notificaciones
// Maneja la creación y gestión de notificaciones del sistema

const { Notification } = require('../models/Notification');

exports.createNotification = async (req, res) => {
    try {
        console.log('\n Creando nueva notificación');
        console.log('Body recibido:', req.body);
        
        const { userId, type, mensaje, dismissable } = req.body;

        if (!userId) {
            console.error(' Error: userId es requerido');
            return res.status(400).json({ 
                message: 'userId es requerido'
            });
        }

        if (!type) {
            console.error(' Error: type es requerido');
            return res.status(400).json({ 
                message: 'type es requerido'
            });
        }

        if (!mensaje) {
            console.error(' Error: mensaje es requerido');
            return res.status(400).json({ 
                message: 'mensaje es requerido'
            });
        }

        const notificationData = {
            userId,
            type,
            title: req.body.title || (type === 'roleApproved' ? '¡Solicitud Aprobada!' : 
                   type === 'roleRejected' ? '¡Solicitud Rechazada!' : 'Notificación'),
            message: mensaje,
            data: { ...req.body.data, dismissable },
            roleType: req.body.roleType,
            isAdminNotification: false,
            read: false
        };

        console.log(' Datos a guardar:', notificationData);

        const notification = await Notification.create(notificationData);

        console.log(' Notificación creada exitosamente:', notification.toJSON());

        res.status(201).json(notification);
    } catch (error) {
        console.error(' Error al crear notificación:');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
        
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                message: 'Error de validación', 
                errors: error.errors.map(e => ({
                    field: e.path,
                    message: e.message,
                    value: e.value
                }))
            });
        }

        res.status(500).json({ 
            message: 'Error al crear la notificación', 
            error: error.message
        });
    }
};

exports.getUserNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const notifications = await Notification.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        const processedNotifications = notifications.map(notification => {
            const notificationData = notification.toJSON();
            
            if (typeof notificationData.data === 'string') {
                try {
                    notificationData.data = JSON.parse(notificationData.data);
                } catch (e) {
                    console.error('Error al parsear data:', e);
                    notificationData.data = {};
                }
            }

            console.log('Notificación procesada:', {
                id: notificationData.id,
                type: notificationData.type,
                roleType: notificationData.roleType,
                data: notificationData.data
            });

            return notificationData;
        });

        res.json(processedNotifications);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ message: 'Error al obtener las notificaciones', error: error.message });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await Notification.destroy({
            where: { id }
        });

        if (result === 0) {
            return res.status(404).json({ message: 'Notificación no encontrada' });
        }

        res.json({ message: 'Notificación eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({ message: 'Error al eliminar la notificación', error: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        
        const notification = await Notification.findByPk(id);
        
        if (!notification) {
            return res.status(404).json({ message: 'Notificación no encontrada' });
        }

        notification.read = true;
        await notification.save();

        res.json(notification);
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({ message: 'Error al actualizar la notificación', error: error.message });
    }
};
