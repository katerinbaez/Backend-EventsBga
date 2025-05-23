const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Rutas públicas
// Ninguna por ahora

// Rutas protegidas (requieren autenticación)
// Solo los administradores pueden acceder a estas rutas
router.get('/', authenticateToken, userController.getAllUsers);
router.get('/:id', authenticateToken, userController.getUserById);
router.post('/', authenticateToken, userController.createUser);
router.put('/:id', authenticateToken, userController.updateUser);
router.delete('/:id', authenticateToken, userController.deleteUser);
router.put('/:id/change-password', authenticateToken, userController.changePassword);

module.exports = router;
