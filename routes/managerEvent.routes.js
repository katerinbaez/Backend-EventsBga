// Rutas de eventos para gestores culturales
// Gestiona la creación, actualización y eliminación de eventos por gestores

const express = require('express');
const router = express.Router();
const managerEventController = require('../controllers/managerEventController');
const { authenticateToken } = require('../middleware/auth');

router.post('/create', authenticateToken, managerEventController.createManagerEvent);

router.get('/manager/:managerId', authenticateToken, managerEventController.getManagerEvents);

router.put('/:id', authenticateToken, managerEventController.updateManagerEvent);
router.post('/update/:id', authenticateToken, managerEventController.updateManagerEvent);

router.delete('/:id', authenticateToken, managerEventController.deleteManagerEvent);

module.exports = router;
