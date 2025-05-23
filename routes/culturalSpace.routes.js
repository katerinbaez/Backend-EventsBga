const express = require('express');
const router = express.Router();
const culturalSpaceController = require('../controllers/culturalSpaceController');

// Rutas para espacios culturales
router.get('/', culturalSpaceController.getAllSpaces);
router.get('/:id', culturalSpaceController.getSpaceById);
router.post('/', culturalSpaceController.createSpace);
router.put('/:id', culturalSpaceController.updateSpace);
router.delete('/:id', culturalSpaceController.deleteSpace);
router.get('/manager/:managerId', culturalSpaceController.getSpacesByManager);

// Rutas para gestión de disponibilidad y horarios
router.get('/space/manager/:managerId', culturalSpaceController.getSpaceByManagerId);
router.get('/availability/:managerId', culturalSpaceController.getSpaceAvailability);
router.post('/availability/:managerId', culturalSpaceController.updateSpaceAvailability);
router.get('/blocked-slots/:managerId', culturalSpaceController.getBlockedSlots);
router.post('/block-slot/:managerId', culturalSpaceController.blockSlot);
router.post('/unblock-slot/:managerId', culturalSpaceController.unblockSlot);

module.exports = router;
