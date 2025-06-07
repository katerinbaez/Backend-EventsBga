// Rutas de métricas del sistema
// Proporciona estadísticas y métricas de eventos, usuarios, categorías y espacios

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const metricsController = require('../controllers/metricsController');

router.get('/general', authenticateToken, metricsController.getGeneralMetrics);
router.get('/events', authenticateToken, metricsController.getEventMetrics);
router.get('/users', authenticateToken, metricsController.getUserMetrics);
router.get('/categories', authenticateToken, metricsController.getCategoryMetrics);
router.get('/spaces', authenticateToken, metricsController.getSpaceMetrics);

module.exports = router;
