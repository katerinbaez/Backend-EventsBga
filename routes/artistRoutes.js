const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artistController');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

// Registrar nuevo artista (con soporte para subida de imagenes)
router.post('/register', upload.single('fotoPerfil'), artistController.registerArtist);

// Obtener perfil de artista por userId
router.get('/profile/:userId', artistController.getArtistProfile);

// Obtener perfil de artista por ID
router.get('/profile-by-id/:artistId', artistController.getArtistProfileById);

// Obtener todos los perfiles de artistas
router.get('/all', artistController.getAllArtists);

// Actualizar perfil de artista (con soporte para subida de imagenes)
router.put('/profile/:userId', upload.single('fotoPerfil'), artistController.updateArtistProfile);

// Subir imagen de perfil
router.put('/upload-profile-image/:userId', upload.single('profileImage'), artistController.uploadProfileImage);

module.exports = router;
