const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const spaceController = require('../controllers/spaceController');

// Proteger todas las rutas con autenticación
router.use(authenticateToken);

// Obtener datos del espacio cultural por ID de manager
router.get('/manager/:managerId', spaceController.getSpaceByManagerId);

// Obtener disponibilidad del espacio
router.get('/availability/:managerId', spaceController.getAvailability);

// Actualizar disponibilidad
router.post('/availability/:managerId', spaceController.updateAvailability);

// Obtener slots bloqueados
router.get('/blocked-slots/:managerId', spaceController.getBlockedSlots);

// Obtener slots bloqueados con formato detallado
router.get('/blocked-slots-detailed/:managerId', spaceController.getBlockedSlotsDetailed);

// Bloquear slot
router.post('/block-slot/:managerId', spaceController.blockSlot);

// Desbloquear slot
router.post('/unblock-slot/:managerId', spaceController.unblockSlot);

// Desbloquear slot por ID específico
router.post('/unblock-slot-by-id/:slotId', spaceController.unblockSlotById);

// Restaurar configuración (eliminar todos los slots bloqueados)
router.post('/reset-configuration/:managerId', spaceController.resetBlockedSlots);

// Obtener eventos del espacio
router.get('/events/:managerId', spaceController.getEvents);

module.exports = router;
