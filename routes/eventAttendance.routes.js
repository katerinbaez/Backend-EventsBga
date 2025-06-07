// Rutas de asistencia a eventos
// Gestiona la confirmación y cancelación de asistencia para artistas y usuarios

const express = require('express');
const router = express.Router();
const eventAttendanceController = require('../controllers/eventAttendanceController');
const { authenticateToken } = require('../middleware/auth');


router.get('/available-events', authenticateToken, eventAttendanceController.getAvailableEvents);

router.post('/confirm', authenticateToken, eventAttendanceController.confirmAttendance);

router.post('/confirm-user', authenticateToken, eventAttendanceController.confirmAttendance);

router.post('/cancel', authenticateToken, eventAttendanceController.cancelAttendance);

router.post('/cancel-user', authenticateToken, eventAttendanceController.cancelAttendance);

router.get('/confirmed-artists/:eventId', authenticateToken, eventAttendanceController.getConfirmedArtists);

router.get('/confirmed-users/:eventId', authenticateToken, eventAttendanceController.getConfirmedUsers);

router.get('/check', authenticateToken, eventAttendanceController.checkAttendance);

router.get('/count/:eventId', eventAttendanceController.getAttendanceCount);

module.exports = router;
