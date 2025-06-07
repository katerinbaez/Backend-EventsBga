// Rutas de gestores culturales
// Gestiona el registro, perfil y gestión de gestores culturales

const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/register', managerController.registerManager);

router.get('/profile/:userId', managerController.getManagerProfile);
router.put('/profile/:userId', managerController.updateManagerProfile);

router.get('/managers', managerController.getManagers);

router.delete('/profile/:userId', managerController.deleteManagerProfile);

module.exports = router;
