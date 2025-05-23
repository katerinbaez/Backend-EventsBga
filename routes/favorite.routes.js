const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const favoriteController = require('../controllers/favoriteController');

// Rutas de favoritos generales
router.get('/check', favoriteController.checkFavorite);
router.get('/', favoriteController.getUserFavorites);
router.post('/', favoriteController.addToFavorites);
router.delete('/', favoriteController.removeFromFavorites);

// Rutas específicas para favoritos de artistas
router.get('/artists', (req, res) => {
    req.query.targetType = 'artist';
    favoriteController.getUserFavorites(req, res);
});
router.post('/artists', (req, res) => {
    req.body.targetType = 'artist';
    favoriteController.addToFavorites(req, res);
});
router.delete('/artists/:artistId', (req, res) => {
    req.body.targetType = 'artist';
    req.body.targetId = req.params.artistId;
    favoriteController.removeFromFavorites(req, res);
});

module.exports = router;
