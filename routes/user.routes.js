// Rutas de usuarios
// Gestiona la creación, actualización y eliminación de usuarios

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, userController.getAllUsers);
router.get('/:id', authenticateToken, userController.getUserById);
router.post('/', authenticateToken, userController.createUser);
router.put('/:id', authenticateToken, userController.updateUser);
router.delete('/:id', authenticateToken, userController.deleteUser);
router.put('/:id/change-password', authenticateToken, userController.changePassword);

module.exports = router;
