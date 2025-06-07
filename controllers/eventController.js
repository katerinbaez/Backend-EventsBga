// Controlador de eventos
// Gestiona operaciones CRUD y transformaciones de eventos

const { Op } = require('sequelize');
const Event = require('../models/Event');
const CulturalSpace = require('../models/CulturalSpace');
const { Artist } = require('../models/Artist');
const { User } = require('../models/User');
const EventRequest = require('../models/EventRequest');

const transformEvent = (event) => ({
  id: event.id,
  titulo: event.titulo || 'Sin título',
  descripcion: event.descripcion || 'Sin descripción',
  fechaProgramada: event.fechaProgramada ? event.fechaProgramada.toISOString() : null,
  precio: event.precio || 0,
  categoria: event.categoria || 'General',
  imagen: event.imagen || null,
  estado: event.estado || 'pendiente',
  horaInicio: event.horaInicio || null,
  horaFin: event.horaFin || null,
  asistentesEsperados: event.asistentesEsperados || 0,
  requerimientosAdicionales: event.requerimientosAdicionales || '',
  space: event.space ? {
    id: event.space.id,
    nombre: event.space.nombre,
    direccion: event.space.direccion || 'Dirección no disponible',
    latitude: event.space.latitude || 0,
    longitude: event.space.longitude || 0
  } : null,
  artist: event.artist ? {
    id: event.artist.id,
    nombreArtistico: event.artist.nombreArtistico
  } : null
});

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      include: [
        { model: CulturalSpace, as: 'space', attributes: ['id', 'nombre', 'direccion', 'latitude', 'longitude'] },
        { model: Artist, as: 'artist', attributes: ['id', 'nombreArtistico'] }
      ],
      order: [['fechaProgramada', 'ASC']]
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

exports.updateEventSimple = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Recibida solicitud para actualizar evento de forma simple:', id);
    console.log('Datos recibidos:', updateData);
    
    const evento = await Event.findByPk(id);
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    await evento.update(updateData);
    
    return res.status(200).json({
      success: true,
      message: 'Evento actualizado exitosamente',
      event: await Event.findByPk(id) 
    });
    
  } catch (error) {
    console.error('Error al actualizar evento de forma simple:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el evento',
      error: error.message
    });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findByPk(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    const isAdminMode = req.query.isAdmin === 'true' || 
                       (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email']);
    const isManagerMode = req.headers['x-user-role'] === 'manager' && req.headers['x-user-email'];
    
    if (isAdminMode) {
      console.log('Modo admin activado: omitiendo verificación de permisos');
    } 
    else if (isManagerMode) {
      console.log('Modo manager activado: omitiendo verificación de permisos');
    }
    else if (req.user) {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        if (event.managerId && event.managerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para eliminar este evento'
          });
        }
      }
    }
    else {
      return res.status(401).json({
        success: false,
        message: 'No autorizado para realizar esta acción'
      });
    }
    
    try {
      const EventAttendance = require('../models/EventAttendance');
      await EventAttendance.destroy({
        where: { eventId: id }
      });
      
      console.log(`Registros de asistencia eliminados para el evento ${id}`);
      
      await event.destroy();
      
      return res.status(200).json({
        success: true,
        message: 'Evento eliminado correctamente'
      });
    } catch (deleteError) {
      console.error('Error al eliminar registros asociados:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar el evento: hay registros asociados que no se pueden eliminar',
        error: deleteError.message
      });
    }
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el evento',
      error: error.message
    });
  }
};

exports.searchEvents = async (req, res) => {
  try {
    const { query, categoria, fechaInicio, fechaFin, location } = req.query;
    
    const whereClause = {};
    if (query) {
      whereClause[Op.or] = [
        { titulo: { [Op.iLike]: `%${query}%` } },
        { descripcion: { [Op.iLike]: `%${query}%` } }
      ];
    }
    if (categoria) {
      whereClause.categoria = categoria;
    }
    if (fechaInicio && fechaFin) {
      whereClause.fechaProgramada = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
};
    }

    const includeOptions = [
      { 
        model: CulturalSpace, 
        as: 'Space', 
        attributes: ['id', 'nombre', 'direccion', 'latitude', 'longitude'] 
      },
      { 
        model: Artist, 
        as: 'Artist', 
        attributes: ['id', 'nombreArtistico'] 
      }
    ];

    if (location) {
      includeOptions[0].where = {
        nombre: { [Op.iLike]: `%${location}%` }
};
    }

    const events = await Event.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['fechaProgramada', 'ASC']]
    });
    
    res.json(events.map(transformEvent));
  } catch (error) {
    console.error('Error en búsqueda de eventos:', error);
    res.status(500).json({ message: 'Error al buscar eventos' });
  }
};

exports.searchAllEventsForDashboard = async (req, res) => {
  try {
    const { query, categoria, fechaInicio, fechaFin, location } = req.query;
    
    const eventsWhereClause = {};
    if (query) {
      eventsWhereClause[Op.or] = [
        { titulo: { [Op.iLike]: `%${query}%` } },
        { descripcion: { [Op.iLike]: `%${query}%` } }
      ];
    }
    if (categoria) {
      eventsWhereClause.categoria = categoria;
    }
    if (fechaInicio && fechaFin) {
      eventsWhereClause.fechaProgramada = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
};
    }

    const includeOptions = [
      { 
        model: CulturalSpace, 
        as: 'space', 
        attributes: ['id', 'nombre', 'direccion', 'latitude', 'longitude'] 
      }
    ];

    if (location) {
      includeOptions[0].where = {
        nombre: { [Op.iLike]: `%${location}%` }
};
    }

    const events = await Event.findAll({
      where: eventsWhereClause,
      include: includeOptions,
      order: [['createdAt', 'DESC']]
    });

    const eventRequestsWhereClause = {
      estado: 'aprobado'
};
    
    if (query) {
      eventRequestsWhereClause[Op.or] = [
        { titulo: { [Op.iLike]: `%${query}%` } },
        { descripcion: { [Op.iLike]: `%${query}%` } }
      ];
    }
    if (categoria) {
      eventRequestsWhereClause.categoria = categoria;
    }
    
    if (fechaInicio && fechaFin) {
      eventRequestsWhereClause.fecha = {
        [Op.between]: [
          new Date(fechaInicio).toISOString().split('T')[0],
          new Date(fechaFin).toISOString().split('T')[0]
        ]
};
    }
    
    const eventRequests = await EventRequest.findAll({
      where: eventRequestsWhereClause,
      order: [['createdAt', 'DESC']]
    });

    const transformedEvents = await Promise.all(events.map(async (event) => {
      let artistInfo = null;
      if (event.managerId) {
        try {
          const artist = await User.findOne({
            where: { id: event.managerId },
            attributes: ['id', 'name', 'email']
          });
          
          if (artist) {
            const artistProfile = await Artist.findOne({
              where: { userId: artist.id }
            });
            
            artistInfo = {
              id: artist.id,
              nombreArtistico: artistProfile ? artistProfile.nombreArtistico : artist.name
};
          }
        } catch (artistError) {
          console.error(`Error al buscar artista para evento ${event.id}:`, artistError);
        }
      }
      
      const eventData = event.toJSON();
      
      if (artistInfo) {
        eventData.artist = artistInfo;
      }
      
      const transformedEvent = transformEvent(eventData);
      
      if (event.fechaProgramada && !transformedEvent.fechaInicio) {
        transformedEvent.fechaInicio = event.fechaProgramada.toISOString();
      }
      
      if (event.fechaProgramada && !transformedEvent.fechaFin) {
        const fechaFin = new Date(event.fechaProgramada);
        fechaFin.setHours(fechaFin.getHours() + 2);
        transformedEvent.fechaFin = fechaFin.toISOString();
      }
      
      return transformedEvent;
    }));

    const transformedEventRequests = await Promise.all(eventRequests.map(async (eventRequest) => {
      let artist = null;
      if (eventRequest.artistId) {
        try {
          const user = await User.findOne({
            where: { id: eventRequest.artistId },
            attributes: ['id', 'name', 'email']
          });
          
          if (user) {
            const artistProfile = await Artist.findOne({
              where: { userId: user.id }
            });
            
            artist = {
              id: user.id,
              nombreArtistico: artistProfile ? artistProfile.nombreArtistico : user.name
            };
          }
        } catch (error) {
          console.error('Error al buscar información del artista:', error);
          artist = {
            id: eventRequest.artistId,
            nombreArtistico: 'Artista'
          };
        }
      }
      
      let space = null;
      if (eventRequest.spaceId) {
        try {
          space = await CulturalSpace.findByPk(eventRequest.spaceId, {
            attributes: ['id', 'nombre', 'direccion', 'latitude', 'longitude']
          });
        } catch (error) {
          console.error(`Error al buscar espacio para solicitud ${eventRequest.id}:`, error);
        }
      }

      const fechaInicio = eventRequest.fecha && eventRequest.horaInicio 
        ? new Date(eventRequest.fecha + 'T' + eventRequest.horaInicio) 
        : null;
        
      const fechaFin = eventRequest.fecha && eventRequest.horaFin 
        ? new Date(eventRequest.fecha + 'T' + eventRequest.horaFin) 
        : null;

      return {
        id: eventRequest.id,
        titulo: eventRequest.titulo || 'Sin título',
        descripcion: eventRequest.descripcion || 'Sin descripción',
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        fechaProgramada: fechaInicio, 
        categoria: eventRequest.categoria || 'General',
        estado: eventRequest.estado || 'pendiente',
        space: space ? {
          id: space.id,
          nombre: space.nombre,
          direccion: space.direccion || 'Dirección no disponible',
          latitude: space.latitude || 0,
          longitude: space.longitude || 0
        } : null,
        artist: artist ? {
          id: artist.id,
          nombreArtistico: artist.nombreArtistico
        } : null,
        isEventRequest: true
};
    }));

    const allEvents = [...transformedEvents, ...transformedEventRequests];

    allEvents.sort((a, b) => {
      const dateA = a.fechaInicio || new Date(0);
      const dateB = b.fechaInicio || new Date(0);
      return dateB - dateA;
    });

    return res.status(200).json({
      success: true,
      events: allEvents
    });
  } catch (error) {
    console.error('Error al buscar todos los eventos para el dashboard:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al buscar eventos para el dashboard',
      error: error.message
    });
  }
};


exports.getApprovedEvents = async (req, res) => {
  try {
    const approvedEvents = await Event.findAll({
      where: {
        estado: 'aprobado'
      },
      limit: 10, 
      order: [['fechaInicio', 'DESC']]
    });
    
    console.log(`Se encontraron ${approvedEvents.length} eventos aprobados`);
    
    const transformedEvents = approvedEvents.map(event => ({
      id: event.id,
      titulo: event.titulo || 'Sin título',
      descripcion: event.descripcion || 'Sin descripción',
      fechaInicio: event.fechaInicio ? event.fechaInicio.toISOString() : null,
      fechaFin: event.fechaFin ? event.fechaFin.toISOString() : null,
      precio: event.precio || 0,
      categoria: event.categoria || 'General',
      imagen: event.imagen || null,
      estado: event.estado || 'aprobado',
      spaceId: event.spaceId,
      artistId: event.artistId
    }));
    
    return res.status(200).json({
      success: true,
      events: transformedEvents
    });
  } catch (error) {
    console.error('Error al obtener eventos aprobados:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener eventos aprobados',
      error: error.message
    });
  }
};

exports.scheduleEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { scheduledDateTime, notes } = req.body;
    
    if (!eventId || !scheduledDateTime) {
      return res.status(400).json({ 
        success: false,
        message: 'ID de evento y fecha/hora de programación son requeridos' 
      });
    }
    
    const event = await Event.findByPk(eventId);
    
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Evento no encontrado' 
      });
    }
    
    if (event.estado !== 'aprobado') {
      return res.status(400).json({ 
        success: false,
        message: 'Solo se pueden programar eventos aprobados' 
      });
    }
    
    const dateTime = new Date(scheduledDateTime);
    
    const offset = dateTime.getTimezoneOffset();
    const adjustedDate = new Date(dateTime.getTime() + (offset * 60 * 1000));
    
    console.log('Fecha original:', scheduledDateTime);
    console.log('Fecha ajustada:', adjustedDate.toISOString());
    
    event.fechaProgramada = adjustedDate;
    event.notas = notes || '';
    event.estado = 'programado';
    
    await event.save();
    
    return res.status(200).json({
      success: true,
      message: 'Evento programado correctamente',
      event: transformEvent(event)
    });
  } catch (error) {
    console.error('Error al programar evento:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al programar el evento',
      error: error.message
    });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    try {
      const event = await Event.findByPk(id, {
        include: [
          { 
            model: CulturalSpace, 
            as: 'space', 
            attributes: ['id', 'nombre', 'direccion', 'capacidad', 'latitude', 'longitude'] 
          },
          { 
            model: Artist, 
            as: 'artist', 
            attributes: ['id', 'nombreArtistico', 'biografia'] 
          }
        ]
      });
      
      if (event) {
        let artistInfo = null;
        if (event.managerId) {
          try {
            const artist = await User.findOne({
              where: { id: event.managerId },
              attributes: ['id', 'name', 'email']
            });
            
            if (artist) {
              const artistProfile = await Artist.findOne({
                where: { userId: artist.id }
              });
              
              artistInfo = {
                id: artist.id,
                nombreArtistico: artistProfile ? artistProfile.nombreArtistico : artist.name
};
            }
          } catch (artistError) {
            console.error(`Error al buscar artista para evento ${event.id}:`, artistError);
          }
        }
        
        const eventData = event.toJSON();
        
        if (artistInfo) {
          eventData.artist = artistInfo;
        }
        
        const transformedEvent = transformEvent(eventData);
        
        if (event.fechaProgramada && !transformedEvent.fechaInicio) {
          transformedEvent.fechaInicio = event.fechaProgramada.toISOString();
        }
        
        if (event.fechaProgramada && !transformedEvent.fechaFin) {
          const fechaFin = new Date(event.fechaProgramada);
          fechaFin.setHours(fechaFin.getHours() + 2);
          transformedEvent.fechaFin = fechaFin.toISOString();
        }
        
        transformedEvent.estado = event.estado || 'pendiente';
        
        if (event.space) {
          transformedEvent.space = {
            id: event.space.id,
            nombre: event.space.nombre || 'Espacio sin nombre',
            direccion: event.space.direccion || 'Dirección no disponible',
            latitude: event.space.latitude || 0,
            longitude: event.space.longitude || 0
          };
        }
        
        return res.status(200).json({
          success: true,
          event: transformedEvent
        });
      } else {
        console.log(`No se encontró evento con ID ${id}`);
      }
    } catch (eventError) {
      console.error('Error al buscar en eventos:', eventError);
    }
    
    try {
      const eventRequest = await EventRequest.findByPk(id);
      
      if (eventRequest) {
        console.log(`Solicitud de evento encontrada: ${eventRequest.titulo}`);
        
        let space = null;
        if (eventRequest.spaceId) {
          space = await CulturalSpace.findByPk(eventRequest.spaceId, {
            attributes: ['id', 'nombre', 'direccion', 'latitude', 'longitude']
          });
        }
        
        let artist = null;
        if (eventRequest.artistId) {
          try {
            const user = await User.findOne({
              where: { id: eventRequest.artistId },
              attributes: ['id', 'name', 'email']
            });
            
            if (user) {
              const artistProfile = await Artist.findOne({
                where: { userId: user.id }
              });
              
              artist = {
                id: user.id,
                nombreArtistico: artistProfile ? artistProfile.nombreArtistico : user.name
              };
            }
          } catch (error) {
            console.error('Error al buscar información del artista:', error);
            artist = {
              id: eventRequest.artistId,
              nombreArtistico: 'Artista'
            };

exports.updateEventSimple = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Recibida solicitud para actualizar evento de forma simple:', id);
    console.log('Datos recibidos:', updateData);
    
    const evento = await Event.findByPk(id);
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    await evento.update(updateData);
    
    return res.status(200).json({
      success: true,
      message: 'Evento actualizado exitosamente',
      event: await Event.findByPk(id) 
    });
    
  } catch (error) {
    console.error('Error al actualizar evento de forma simple:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el evento',
      error: error.message
    });
  }
};
          }
        }
        
        const fechaInicio = eventRequest.fecha && eventRequest.horaInicio 
          ? new Date(eventRequest.fecha + 'T' + eventRequest.horaInicio) 
          : null;
          
        const fechaFin = eventRequest.fecha && eventRequest.horaFin 
          ? new Date(eventRequest.fecha + 'T' + eventRequest.horaFin) 
          : null;
        
        const transformedEvent = {
          id: eventRequest.id,
          titulo: eventRequest.titulo || 'Sin título',
          descripcion: eventRequest.descripcion || 'Sin descripción',
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          fechaProgramada: fechaInicio, 
          categoria: eventRequest.categoria || 'General',
          estado: eventRequest.estado || 'pendiente',
          space: space ? {
            id: space.id,
            nombre: space.nombre,
            direccion: space.direccion || 'Dirección no disponible',
            latitude: space.latitude || 0,
            longitude: space.longitude || 0
          } : null,
          artist: artist ? {
            id: artist.id,
            nombreArtistico: artist.nombreArtistico
          } : null,
          isEventRequest: true
};
        
        return res.status(200).json({
          success: true,
          event: transformedEvent
        });
      } else {
        console.log(`No se encontró solicitud de evento con ID ${id}`);
      }
    } catch (requestError) {
      console.error('Error al buscar en solicitudes de eventos:', requestError);
    }
    
    return res.status(404).json({ 
      success: false,
      message: 'Evento no encontrado' 
    });
  } catch (error) {
    console.error('Error al obtener detalle del evento:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener detalle del evento',
      error: error.message
    });
  }
};

exports.registerToEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { artistId } = req.body;
    
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Evento no encontrado' 
      });
    }
    
    const registeredArtists = event.registeredArtists || [];
    if (registeredArtists.includes(artistId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El artista ya está registrado en este evento' 
      });
    }
    
    if (registeredArtists.length >= event.capacity) {
      return res.status(400).json({ 
        success: false, 
        message: 'El evento ha alcanzado su capacidad máxima' 
      });
    }
    
    event.registeredArtists = [...registeredArtists, artistId];
    await event.save();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Registro exitoso', 
      event: transformEvent(event) 
    });
  } catch (error) {
    console.error('Error al registrar artista en evento:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al registrar al artista en el evento',
      error: error.message
    });
  }
};

exports.getRegisteredArtists = async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Evento no encontrado' 
      });
    }
    
    const registeredArtistIds = event.registeredArtists || [];
    
    if (registeredArtistIds.length === 0) {
      return res.status(200).json({ 
        success: true, 
        artists: [] 
      });
    }
    
    const artists = await User.findAll({
      where: {
        id: {
          [Op.in]: registeredArtistIds
        }
      },
      attributes: ['id', 'name', 'email']
    });
    
    return res.status(200).json({ 
      success: true, 
      artists 
    });
  } catch (error) {
    console.error('Error al obtener artistas registrados:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener los artistas registrados',
      error: error.message
    });
  }
};
