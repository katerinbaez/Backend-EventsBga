const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Rutas de autenticación
router.post('/login', authController.login);

module.exports = router;
