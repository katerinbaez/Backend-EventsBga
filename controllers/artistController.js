// Controlador para manejar operaciones relacionadas con artistas
// Incluye registro, actualización y gestión de perfiles de artistas

const { Artist } = require('../models/Artist');
const path = require('path');
const fs = require('fs');

const getImageUrl = (filename) => {
    if (!filename) return null;
    return `/uploads/profile-pics/${filename}`;
};

exports.registerArtist = async (req, res) => {
    try {
        const { userId } = req.body;

        const existingArtist = await Artist.findOne({ where: { userId } });
        if (existingArtist) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un perfil de artista para este usuario'
            });
        }

        const artistData = {
            userId,
            nombreArtistico: req.body.nombreArtistico || '',
            biografia: req.body.biografia || '',
            isProfileComplete: false
        };
        
        if (req.body.habilidades) {
            try {
                artistData.habilidades = JSON.parse(req.body.habilidades);
            } catch (e) {
                if (typeof req.body.habilidades === 'string') {
                    if (req.body.habilidades.includes(',')) {
                        artistData.habilidades = req.body.habilidades.split(',').map(item => item.trim());
                    } else {
                        artistData.habilidades = [req.body.habilidades.trim()];
                    }
                } else {
                    artistData.habilidades = [];
                }
            }
        } else {
            artistData.habilidades = [];
        }
        
        try {
            artistData.portfolio = req.body.portfolio ? JSON.parse(req.body.portfolio) : {
                trabajos: [],
                imagenes: []
            };
        } catch (e) {
            artistData.portfolio = {
                trabajos: [],
                imagenes: []
            };
        }
        
        try {
            artistData.redesSociales = req.body.redesSociales ? JSON.parse(req.body.redesSociales) : {
                instagram: '',
                facebook: '',
                twitter: '',
                youtube: ''
            };
        } catch (e) {
            artistData.redesSociales = {
                instagram: '',
                facebook: '',
                twitter: '',
                youtube: ''
            };
        }
        
        try {
            artistData.contacto = req.body.contacto ? JSON.parse(req.body.contacto) : {
                email: '',
                telefono: '',
                ciudad: ''
            };
        } catch (e) {
            artistData.contacto = {
                email: '',
                telefono: '',
                ciudad: ''
            };
        }
        
        if (req.file) {
            artistData.fotoPerfil = getImageUrl(req.file.filename);
        }
        
        const artist = await Artist.create(artistData);

        res.json({
            success: true,
            message: 'Perfil de artista creado exitosamente',
            artist
        });
    } catch (error) {
        console.error('Error al registrar artista:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el perfil de artista',
            error: error.message
        });
    }
};

exports.getArtistProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const artist = await Artist.findOne({ where: { userId } });
        if (!artist) {
            return res.status(404).json({
                success: false,
                message: 'Perfil de artista no encontrado'
            });
        }

        res.json({
            success: true,
            artist
        });
    } catch (error) {
        console.error('Error al obtener perfil de artista:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el perfil de artista',
            error: error.message
        });
    }
};

exports.updateArtistProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const artist = await Artist.findOne({ where: { userId } });
        if (!artist) {
            return res.status(404).json({
                success: false,
                message: 'Perfil de artista no encontrado'
            });
        }

        const updatedData = {
            nombreArtistico: req.body.nombreArtistico,
            biografia: req.body.biografia,
            isProfileComplete: true 
        };
        
        if (req.body.habilidades) {
            if (Array.isArray(req.body.habilidades)) {
                updatedData.habilidades = req.body.habilidades;
            } else {
                try {
                    updatedData.habilidades = JSON.parse(req.body.habilidades);
                } catch (e) {
                    if (typeof req.body.habilidades === 'string') {
                        if (req.body.habilidades.includes(',')) {
                            updatedData.habilidades = req.body.habilidades.split(',').map(item => item.trim());
                        } else {
                            updatedData.habilidades = [req.body.habilidades.trim()];
                        }
                    } else {
                        updatedData.habilidades = artist.habilidades;
                    }
                }
            }
        } else {
            updatedData.habilidades = artist.habilidades;
        }
        
        if (req.body.portfolio) {
            if (typeof req.body.portfolio === 'object' && !Array.isArray(req.body.portfolio)) {
                updatedData.portfolio = req.body.portfolio;
            } else {
                try {
                    updatedData.portfolio = JSON.parse(req.body.portfolio);
                } catch (e) {
                    updatedData.portfolio = artist.portfolio;
                }
            }
        } else {
          
            updatedData.portfolio = artist.portfolio;
        }
        
        if (req.body.redesSociales) {
            if (typeof req.body.redesSociales === 'object' && !Array.isArray(req.body.redesSociales)) {
                updatedData.redesSociales = req.body.redesSociales;
            } else {
                try {
                    updatedData.redesSociales = JSON.parse(req.body.redesSociales);
                } catch (e) {
                    updatedData.redesSociales = artist.redesSociales;
                }
            }
        } else {
            updatedData.redesSociales = artist.redesSociales;
        }
        
        if (req.body.contacto) {
            if (typeof req.body.contacto === 'object' && !Array.isArray(req.body.contacto)) {
                updatedData.contacto = req.body.contacto;
            } else {
                try {
                    updatedData.contacto = JSON.parse(req.body.contacto);
                } catch (e) {
                    updatedData.contacto = artist.contacto;
                }
            }
        } else {
            updatedData.contacto = artist.contacto;
        }
        
        if (req.body.fotoPerfil) {
            updatedData.fotoPerfil = req.body.fotoPerfil;
        }
        
        if (req.file) {
            if (artist.fotoPerfil) {
                const oldImagePath = path.join(__dirname, '..', 'public', artist.fotoPerfil);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            
            updatedData.fotoPerfil = getImageUrl(req.file.filename);
        }

        await artist.update(updatedData);

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            artist: await Artist.findOne({ where: { userId } }) 
        });
    } catch (error) {
        console.error('Error al actualizar perfil de artista:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el perfil',
            error: error.message
        });
    }
};

exports.getAllArtists = async (req, res) => {
    try {
        const artists = await Artist.findAll({
            where: {
                isProfileComplete: true
            },
            order: [
                ['nombreArtistico', 'ASC']
            ]
        });

        res.json({
            success: true,
            artists
        });
    } catch (error) {
        console.error('Error al obtener perfiles de artistas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los perfiles de artistas',
            error: error.message
        });
    }
};

exports.uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se ha proporcionado ninguna imagen'
            });
        }

        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID del usuario'
            });
        }

        const artist = await Artist.findOne({ where: { userId } });
        if (!artist) {
            return res.status(404).json({
                success: false,
                message: 'Perfil de artista no encontrado'
            });
        }

        if (artist.fotoPerfil) {
            const oldImagePath = path.join(__dirname, '..', 'public', artist.fotoPerfil);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        const imageUrl = getImageUrl(req.file.filename);
        
        await artist.update({ fotoPerfil: imageUrl });

        res.json({
            success: true,
            message: 'Imagen de perfil subida exitosamente',
            imageUrl: imageUrl
        });
    } catch (error) {
        console.error('Error al subir imagen de perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error al subir la imagen de perfil',
            error: error.message
        });
    }
};

exports.getArtistProfileById = async (req, res) => {
    try {
        const { artistId } = req.params;

        let artist = await Artist.findOne({ where: { id: artistId } });

        if (!artist) {
            console.log(`No se encontró artista con ID exacto ${artistId}, buscando alternativas...`);
            const allArtists = await Artist.findAll();
            
            for (const a of allArtists) {
                if (a.id.toString() === artistId.toString()) {
                    artist = a;
                    console.log(`Encontrado artista por comparación de strings: ${a.id}`);
                    break;
                }
            }
        }

        if (!artist) {
            return res.status(404).json({
                success: false,
                message: 'Perfil de artista no encontrado'
            });
        }

        res.json({
            success: true,
            artist
        });
    } catch (error) {
        console.error('Error al obtener perfil de artista por ID:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el perfil de artista',
            error: error.message
        });
    }
};

exports.deleteArtistProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const artist = await Artist.findOne({ where: { userId } });
        
        if (!artist) {
            return res.status(404).json({
                success: false,
                message: 'Perfil de artista no encontrado'
            });
        }
        
        if (artist.fotoPerfil) {
            const imagePath = artist.fotoPerfil.replace(/^\/uploads\/profile-pics\//, '');
            const fullPath = path.join(__dirname, '..', 'uploads', 'profile-pics', imagePath);
            
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(`Imagen de perfil eliminada: ${fullPath}`);
            }
        }
        
        await artist.destroy();
        
        res.json({
            success: true,
            message: 'Perfil de artista eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar perfil de artista:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el perfil de artista',
            error: error.message
        });
    }
};
