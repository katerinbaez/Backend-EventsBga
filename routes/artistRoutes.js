// Rutas para gestión de artistas
// Incluye registro, perfil y actualización de artistas

const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artistController');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');

router.use(authenticateToken);

router.post('/register', upload.single('fotoPerfil'), artistController.registerArtist);

router.get('/profile/:userId', artistController.getArtistProfile);

router.get('/profile-by-id/:artistId', artistController.getArtistProfileById);

router.get('/all', artistController.getAllArtists);

router.put('/profile/:userId', upload.single('fotoPerfil'), artistController.updateArtistProfile);

router.put('/upload-profile-image/:userId', upload.single('profileImage'), artistController.uploadProfileImage);

router.delete('/profile/:userId', artistController.deleteArtistProfile);
module.exports = router;
