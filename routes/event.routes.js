// Rutas de eventos
// Gestiona la gestión completa de eventos, incluyendo registro y programación

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const eventController = require('../controllers/eventController');

router.get('/', eventController.getAllEvents);
router.get('/search', eventController.searchEvents);
router.get('/dashboard/search', eventController.searchAllEventsForDashboard); // Nueva ruta para buscar eventos en el dashboard
router.get('/approved', eventController.getApprovedEvents); // Nueva ruta para obtener eventos aprobados
router.get('/:id', eventController.getEventById);
router.post('/:id/register', authenticateToken, eventController.registerToEvent);
router.get('/:id/registered-artists', authenticateToken, eventController.getRegisteredArtists);
router.post('/:id/schedule', eventController.scheduleEvent); // Nueva ruta para programar eventos sin autenticación
router.post('/:id/update', eventController.updateEventSimple); // Nueva ruta para actualizar eventos sin restricciones
router.put('/:id', eventController.updateEventSimple); // Ruta PUT para actualizar eventos (similar a la de usuarios)
router.delete('/:id', authenticateToken, eventController.deleteEvent); // Ruta para eliminar eventos

module.exports = router;
