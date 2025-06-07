// Rutas de notificaciones
// Gestiona la creación, obtención y actualización de notificaciones del sistema

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.post('/', notificationController.createNotification);

router.get('/:userId', notificationController.getUserNotifications);

router.delete('/:id', notificationController.deleteNotification);

router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
