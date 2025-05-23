const { Artist } = require('../models/Artist');
const path = require('path');
const fs = require('fs');

// Obtener la URL base para las imu00e1genes
const getImageUrl = (filename) => {
    if (!filename) return null;
    // Construir la URL relativa para acceder a la imagen
    return `/uploads/profile-pics/${filename}`;
};

exports.registerArtist = async (req, res) => {
    try {
        const { userId } = req.body;

        // Verificar si el artista ya existe
        const existingArtist = await Artist.findOne({ where: { userId } });
        if (existingArtist) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un perfil de artista para este usuario'
            });
        }

        // Procesar los datos para crear el artista
        const artistData = {
            userId,
            nombreArtistico: req.body.nombreArtistico || '',
            biografia: req.body.biografia || '',
            isProfileComplete: false
        };
        
        // Procesar habilidades
        if (req.body.habilidades) {
            try {
                // Intentar parsear como JSON
                artistData.habilidades = JSON.parse(req.body.habilidades);
            } catch (e) {
                // Si no es JSON válido, verificar si es un string y convertirlo a array
                if (typeof req.body.habilidades === 'string') {
                    // Si es una cadena separada por comas, dividirla
                    if (req.body.habilidades.includes(',')) {
                        artistData.habilidades = req.body.habilidades.split(',').map(item => item.trim());
                    } else {
                        // Si es una sola habilidad, crear un array con ella
                        artistData.habilidades = [req.body.habilidades.trim()];
                    }
                } else {
                    // Valor por defecto
                    artistData.habilidades = [];
                }
            }
        } else {
            artistData.habilidades = [];
        }
        
        // Procesar portfolio
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
        
        // Procesar redes sociales
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
        
        // Procesar contacto
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
        
        // Si hay un archivo de imagen, guardar su URL
        if (req.file) {
            artistData.fotoPerfil = getImageUrl(req.file.filename);
        }
        
        // Crear el artista
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

        // Preparar los datos para actualizar
        const updatedData = {
            nombreArtistico: req.body.nombreArtistico,
            biografia: req.body.biografia,
            isProfileComplete: true // Marcar como completo al actualizar
        };
        
        // Procesar habilidades
        if (req.body.habilidades) {
            // Si ya es un array, usarlo directamente
            if (Array.isArray(req.body.habilidades)) {
                updatedData.habilidades = req.body.habilidades;
            } else {
                try {
                    // Intentar parsear como JSON
                    updatedData.habilidades = JSON.parse(req.body.habilidades);
                } catch (e) {
                    // Si no es JSON válido, verificar si es un string y convertirlo a array
                    if (typeof req.body.habilidades === 'string') {
                        // Si es una cadena separada por comas, dividirla
                        if (req.body.habilidades.includes(',')) {
                            updatedData.habilidades = req.body.habilidades.split(',').map(item => item.trim());
                        } else {
                            // Si es una sola habilidad, crear un array con ella
                            updatedData.habilidades = [req.body.habilidades.trim()];
                        }
                    } else {
                        // Mantener las habilidades existentes
                        updatedData.habilidades = artist.habilidades;
                    }
                }
            }
        } else {
            // Mantener las habilidades existentes
            updatedData.habilidades = artist.habilidades;
        }
        
        // Procesar portfolio
        if (req.body.portfolio) {
            // Si ya es un objeto, usarlo directamente
            if (typeof req.body.portfolio === 'object' && !Array.isArray(req.body.portfolio)) {
                updatedData.portfolio = req.body.portfolio;
            } else {
                try {
                    updatedData.portfolio = JSON.parse(req.body.portfolio);
                } catch (e) {
                    // Mantener el portfolio existente
                    updatedData.portfolio = artist.portfolio;
                }
            }
        } else {
            // Mantener el portfolio existente
            updatedData.portfolio = artist.portfolio;
        }
        
        // Procesar redes sociales
        if (req.body.redesSociales) {
            // Si ya es un objeto, usarlo directamente
            if (typeof req.body.redesSociales === 'object' && !Array.isArray(req.body.redesSociales)) {
                updatedData.redesSociales = req.body.redesSociales;
            } else {
                try {
                    updatedData.redesSociales = JSON.parse(req.body.redesSociales);
                } catch (e) {
                    // Mantener las redes sociales existentes
                    updatedData.redesSociales = artist.redesSociales;
                }
            }
        } else {
            // Mantener las redes sociales existentes
            updatedData.redesSociales = artist.redesSociales;
        }
        
        // Procesar contacto
        if (req.body.contacto) {
            // Si ya es un objeto, usarlo directamente
            if (typeof req.body.contacto === 'object' && !Array.isArray(req.body.contacto)) {
                updatedData.contacto = req.body.contacto;
            } else {
                try {
                    updatedData.contacto = JSON.parse(req.body.contacto);
                } catch (e) {
                    // Mantener el contacto existente
                    updatedData.contacto = artist.contacto;
                }
            }
        } else {
            // Mantener el contacto existente
            updatedData.contacto = artist.contacto;
        }
        
        // Si hay una foto de perfil en el cuerpo, mantenerla
        if (req.body.fotoPerfil) {
            updatedData.fotoPerfil = req.body.fotoPerfil;
        }
        
        // Si hay un archivo de imagen nuevo
        if (req.file) {
            // Eliminar la imagen anterior si existe
            if (artist.fotoPerfil) {
                const oldImagePath = path.join(__dirname, '..', 'public', artist.fotoPerfil);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            
            // Guardar la nueva URL de imagen
            updatedData.fotoPerfil = getImageUrl(req.file.filename);
        }

        await artist.update(updatedData);

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            artist: await Artist.findOne({ where: { userId } }) // Obtener el artista actualizado
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

// Obtener todos los perfiles de artistas
exports.getAllArtists = async (req, res) => {
    try {
        // Obtener todos los artistas con perfiles completos
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

// Subir imagen de perfil para un artista
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

        // Verificar si el artista existe
        const artist = await Artist.findOne({ where: { userId } });
        if (!artist) {
            return res.status(404).json({
                success: false,
                message: 'Perfil de artista no encontrado'
            });
        }

        // Eliminar la imagen anterior si existe
        if (artist.fotoPerfil) {
            const oldImagePath = path.join(__dirname, '..', 'public', artist.fotoPerfil);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Guardar la nueva URL de imagen
        const imageUrl = getImageUrl(req.file.filename);
        
        // Actualizar el perfil del artista con la nueva URL de imagen
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

// Obtener perfil de artista por ID
exports.getArtistProfileById = async (req, res) => {
    try {
        const { artistId } = req.params;

        // Intentar encontrar el artista por ID exacto
        let artist = await Artist.findOne({ where: { id: artistId } });

        // Si no se encuentra, buscar por comparación de strings
        if (!artist) {
            console.log(`No se encontró artista con ID exacto ${artistId}, buscando alternativas...`);
            const allArtists = await Artist.findAll();
            
            // Buscar un artista cuyo ID coincida con el artistId (como string)
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
