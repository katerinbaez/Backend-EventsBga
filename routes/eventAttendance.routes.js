const express = require('express');
const router = express.Router();
const eventAttendanceController = require('../controllers/eventAttendanceController');
const { authenticateToken } = require('../middleware/auth');

// Obtener todos los eventos disponibles para artistas
router.get('/available-events', authenticateToken, eventAttendanceController.getAvailableEvents);

// Confirmar asistencia a un evento
router.post('/confirm', authenticateToken, eventAttendanceController.confirmAttendance);

// Confirmar asistencia a un evento para usuarios regulares (alias para compatibilidad)
router.post('/confirm-user', authenticateToken, eventAttendanceController.confirmAttendance);

// Cancelar asistencia a un evento
router.post('/cancel', authenticateToken, eventAttendanceController.cancelAttendance);

// Cancelar asistencia a un evento para usuarios regulares (alias para compatibilidad)
router.post('/cancel-user', authenticateToken, eventAttendanceController.cancelAttendance);

// Obtener artistas confirmados para un evento
router.get('/confirmed-artists/:eventId', authenticateToken, eventAttendanceController.getConfirmedArtists);

// Obtener usuarios regulares confirmados para un evento
router.get('/confirmed-users/:eventId', authenticateToken, eventAttendanceController.getConfirmedUsers);

// Verificar si un usuario o artista está confirmado para un evento
router.get('/check', authenticateToken, eventAttendanceController.checkAttendance);

// Obtener el conteo de asistentes para un evento específico
router.get('/count/:eventId', eventAttendanceController.getAttendanceCount);

module.exports = router;
