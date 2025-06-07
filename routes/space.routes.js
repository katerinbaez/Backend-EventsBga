// Rutas de espacios culturales
// Gestiona la disponibilidad y bloqueo de horarios de espacios

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const spaceController = require('../controllers/spaceController');

router.use(authenticateToken);

router.get('/manager/:managerId', spaceController.getSpaceByManagerId);

router.get('/availability/:managerId', spaceController.getAvailability);

router.post('/availability/:managerId', spaceController.updateAvailability);

router.get('/blocked-slots/:managerId', spaceController.getBlockedSlots);

router.get('/blocked-slots-detailed/:managerId', spaceController.getBlockedSlotsDetailed);

router.post('/block-slot/:managerId', spaceController.blockSlot);

router.post('/unblock-slot/:managerId', spaceController.unblockSlot);

router.post('/unblock-slot-by-id/:slotId', spaceController.unblockSlotById);

router.post('/reset-configuration/:managerId', spaceController.resetBlockedSlots);

router.get('/events/:managerId', spaceController.getEvents);

module.exports = router;
