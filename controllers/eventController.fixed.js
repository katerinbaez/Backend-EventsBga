const { Op } = require('sequelize');
// Importar los modelos directamente
const Event = require('../models/Event');
const CulturalSpace = require('../models/CulturalSpace');
const { Artist } = require('../models/Artist');

// Transformar evento al formato del frontend
const transformEvent = (event) => ({
  id: event.id,
  titulo: event.titulo,
  descripcion: event.descripcion,
  fechaProgramada: event.fechaProgramada,
  categoria: event.categoria,
  tipoEvento: event.tipoEvento,
  asistentesEsperados: event.asistentesEsperados,
  requerimientosAdicionales: event.requerimientosAdicionales,
  managerId: event.managerId,
  artistId: event.artistId,
  spaceId: event.spaceId,
  estado: event.estado,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
  space: event.space ? {
    id: event.space.id,
    nombre: event.space.nombre,
    direccion: event.space.direccion,
    latitude: event.space.latitude,
    longitude: event.space.longitude
  } : null,
  artist: event.artist ? {
    id: event.artist.id,
    nombreArtistico: event.artist.nombreArtistico
  } : null
});

// Obtener todos los eventos
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      include: [
        { model: CulturalSpace, as: 'space', attributes: ['id', 'nombre', 'direccion', 'latitude', 'longitude'] },
        { model: Artist, as: 'artist', attributes: ['id', 'nombreArtistico'] }
      ],
      order: [['fechaProgramada', 'ASC']] // Corregido: usar fechaProgramada en lugar de fechaInicio
    });
    
    return res.status(200).json({
      success: true,
      events: events.map(transformEvent)
    });
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener eventos',
      error: error.message
    });
  }
};
