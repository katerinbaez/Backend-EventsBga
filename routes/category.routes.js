const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Rutas de categorías
router.get('/', categoryController.getAllCategories);

module.exports = router;
