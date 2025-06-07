// Rutas de autenticación
// Gestiona el login de usuarios

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();


router.post('/login', authController.login);

module.exports = router;
