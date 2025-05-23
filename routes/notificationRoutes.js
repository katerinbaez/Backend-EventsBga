const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Crear una nueva notificación
router.post('/', notificationController.createNotification);

// Obtener notificaciones de un usuario
router.get('/:userId', notificationController.getUserNotifications);

// Eliminar una notificación
router.delete('/:id', notificationController.deleteNotification);

// Marcar notificación como leída
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
