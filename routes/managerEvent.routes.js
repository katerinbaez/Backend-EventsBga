const express = require('express');
const router = express.Router();
const managerEventController = require('../controllers/managerEventController');
const { authenticateToken } = require('../middleware/auth');

// Ruta para crear eventos directamente como gestor cultural
router.post('/create', authenticateToken, managerEventController.createManagerEvent);

// Ruta para obtener todos los eventos creados por un gestor
router.get('/manager/:managerId', authenticateToken, managerEventController.getManagerEvents);

// Ruta para actualizar un evento específico
router.put('/:id', authenticateToken, managerEventController.updateManagerEvent);

// Ruta alternativa para actualizar un evento (para compatibilidad con el frontend)
router.post('/update/:id', authenticateToken, managerEventController.updateManagerEvent);

// Ruta para eliminar un evento
router.delete('/:id', authenticateToken, managerEventController.deleteManagerEvent);

module.exports = router;
