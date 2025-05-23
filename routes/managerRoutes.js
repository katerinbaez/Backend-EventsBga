const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticateToken } = require('../middleware/auth');

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

// Registrar nuevo gestor cultural
router.post('/register', managerController.registerManager);

// Obtener perfil de gestor cultural
router.get('/profile/:userId', managerController.getManagerProfile);

// Actualizar perfil de gestor cultural
router.put('/profile/:userId', managerController.updateManagerProfile);

// Obtener todos los gestores culturales
router.get('/managers', managerController.getManagers);

// Eliminar perfil de gestor cultural
router.delete('/profile/:userId', managerController.deleteManagerProfile);

module.exports = router;
