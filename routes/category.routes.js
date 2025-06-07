// Rutas de categorías
// Gestiona la obtención de categorías del sistema

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.get('/', categoryController.getAllCategories);

module.exports = router;
