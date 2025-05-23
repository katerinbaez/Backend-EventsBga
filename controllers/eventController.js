const { Op } = require('sequelize');
// Importar los modelos directamente
const Event = require('../models/Event');
const CulturalSpace = require('../models/CulturalSpace');
const { Artist } = require('../models/Artist');
const { User } = require('../models/User');
const EventRequest = require('../models/EventRequest');

// Transformar evento al formato del frontend
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

// Obtener todos los eventos
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

// Actualizar un evento de forma simple sin restricciones
exports.updateEventSimple = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Recibida solicitud para actualizar evento de forma simple:', id);
    console.log('Datos recibidos:', updateData);
    
    // Verificar que el evento exista
    const evento = await Event.findByPk(id);
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // Actualizar el evento con todos los datos proporcionados
    await evento.update(updateData);
    
    return res.status(200).json({
      success: true,
      message: 'Evento actualizado exitosamente',
      event: await Event.findByPk(id) // Devolver el evento actualizado
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

// Eliminar un evento
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el evento exista
    const event = await Event.findByPk(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // Verificar si se está usando el modo admin o manager mediante headers especiales
    const isAdminMode = req.query.isAdmin === 'true' || 
                       (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email']);
    const isManagerMode = req.headers['x-user-role'] === 'manager' && req.headers['x-user-email'];
    
    // Si es modo admin o manager, omitir verificación de permisos
    if (isAdminMode) {
      console.log('Modo admin activado: omitiendo verificación de permisos');
    } 
    else if (isManagerMode) {
      console.log('Modo manager activado: omitiendo verificación de permisos');
    }
    // Si no es modo admin/manager y req.user existe, verificar permisos normalmente
    else if (req.user) {
      // Verificar permisos (el creador, un manager o un admin puede eliminar)
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        // Si no es admin ni manager, verificar si es el creador
        if (event.managerId && event.managerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para eliminar este evento'
          });
        }
      }
    }
    // Si no es modo admin/manager y req.user no existe, rechazar la solicitud
    else {
      return res.status(401).json({
        success: false,
        message: 'No autorizado para realizar esta acción'
      });
    }
    
    try {
      // Primero eliminar los registros asociados en EventAttendances
      const EventAttendance = require('../models/EventAttendance');
      await EventAttendance.destroy({
        where: { eventId: id }
      });
      
      console.log(`Registros de asistencia eliminados para el evento ${id}`);
      
      // Luego eliminar el evento
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

// Buscar eventos
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

    // Opciones para incluir el espacio cultural
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

    // Si se especifica una ubicación, filtrar por ella
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

// Buscar todos los eventos para el dashboard del usuario (combina Events y EventRequests aprobados)
exports.searchAllEventsForDashboard = async (req, res) => {
  try {
    const { query, categoria, fechaInicio, fechaFin, location } = req.query;
    
    // Construir cláusulas de búsqueda para Events
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

    // Opciones para incluir el espacio cultural
    const includeOptions = [
      { 
        model: CulturalSpace, 
        as: 'space', 
        attributes: ['id', 'nombre', 'direccion', 'latitude', 'longitude'] 
      }
    ];

    // Si se especifica una ubicación, filtrar por ella
    if (location) {
      includeOptions[0].where = {
        nombre: { [Op.iLike]: `%${location}%` }
};
    }

    // Buscar eventos regulares
    const events = await Event.findAll({
      where: eventsWhereClause,
      include: includeOptions,
      order: [['createdAt', 'DESC']]
    });

    // Construir cláusulas de búsqueda para EventRequests aprobados
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
    
    // Agregar filtro de fechas para EventRequests
    if (fechaInicio && fechaFin) {
      eventRequestsWhereClause.fecha = {
        [Op.between]: [
          new Date(fechaInicio).toISOString().split('T')[0],
          new Date(fechaFin).toISOString().split('T')[0]
        ]
};
    }
    
    // Buscar solicitudes de eventos aprobadas sin incluir el modelo User
    const eventRequests = await EventRequest.findAll({
      where: eventRequestsWhereClause,
      order: [['createdAt', 'DESC']]
    });

    // Transformar los eventos regulares y asegurarnos de que incluyan toda la información necesaria
    const transformedEvents = await Promise.all(events.map(async (event) => {
      // Buscar información del artista si es necesario
      let artistInfo = null;
      if (event.managerId) {
        try {
          const artist = await User.findOne({
            where: { id: event.managerId },
            attributes: ['id', 'name', 'email']
          });
          
          if (artist) {
            // Buscar el perfil de artista asociado a este usuario
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
      
      // Crear una copia del evento para transformarlo
      const eventData = event.toJSON();
      
      // Añadir la información del artista si la encontramos
      if (artistInfo) {
        eventData.artist = artistInfo;
      }
      
      // Transformar el evento
      const transformedEvent = transformEvent(eventData);
      
      // Asegurarnos de que fechaInicio y fechaFin estén presentes
      if (event.fechaProgramada && !transformedEvent.fechaInicio) {
        transformedEvent.fechaInicio = event.fechaProgramada.toISOString();
      }
      
      if (event.fechaProgramada && !transformedEvent.fechaFin) {
        // Añadir 2 horas por defecto para la duración del evento
        const fechaFin = new Date(event.fechaProgramada);
        fechaFin.setHours(fechaFin.getHours() + 2);
        transformedEvent.fechaFin = fechaFin.toISOString();
      }
      
      return transformedEvent;
    }));

    // Transformar las solicitudes de eventos aprobadas
    const transformedEventRequests = await Promise.all(eventRequests.map(async (eventRequest) => {
      // Buscar información del artista por separado
      let artist = null;
      if (eventRequest.artistId) {
        try {
          // Buscar el usuario
          const user = await User.findOne({
            where: { id: eventRequest.artistId },
            attributes: ['id', 'name', 'email']
          });
          
          if (user) {
            // Buscar el perfil de artista asociado a este usuario
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
          // Si hay un error, usar el ID como respaldo
          artist = {
            id: eventRequest.artistId,
            nombreArtistico: 'Artista'
          };
        }
      }
      
      // Buscar información del espacio cultural por separado
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

      // Crear fecha de inicio
      const fechaInicio = eventRequest.fecha && eventRequest.horaInicio 
        ? new Date(eventRequest.fecha + 'T' + eventRequest.horaInicio) 
        : null;
        
      // Crear fecha de fin
      const fechaFin = eventRequest.fecha && eventRequest.horaFin 
        ? new Date(eventRequest.fecha + 'T' + eventRequest.horaFin) 
        : null;

      // Transformar la solicitud al formato de evento
      return {
        id: eventRequest.id,
        titulo: eventRequest.titulo || 'Sin título',
        descripcion: eventRequest.descripcion || 'Sin descripción',
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        fechaProgramada: fechaInicio, // Agregar fechaProgramada para compatibilidad con el frontend
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

    // Combinar ambos conjuntos de eventos
    const allEvents = [...transformedEvents, ...transformedEventRequests];

    // Ordenar por fecha de creación (más recientes primero)
    allEvents.sort((a, b) => {
      const dateA = a.fechaInicio || new Date(0);
      const dateB = b.fechaInicio || new Date(0);
      return dateB - dateA;
    });

    // Devolver la respuesta en el formato esperado por el frontend
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

// Obtener eventos aprobados para programación
exports.getApprovedEvents = async (req, res) => {
  try {
    const approvedEvents = await Event.findAll({
      where: {
        estado: 'aprobado'
      },
      limit: 10, // Limitar a 10 eventos para evitar sobrecarga
      order: [['fechaInicio', 'DESC']]
    });
    
    console.log(`Se encontraron ${approvedEvents.length} eventos aprobados`);
    
    // Transformar los eventos sin incluir relaciones
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

// Programar un evento aprobado
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
    
    // Buscar el evento
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
    
    // Actualizar el evento con la fecha programada
    event.fechaProgramada = new Date(scheduledDateTime);
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

// Obtener detalle de un evento
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primero, intentar encontrar en la tabla Event
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
        // Buscar información del artista si es necesario
        let artistInfo = null;
        if (event.managerId) {
          try {
            const artist = await User.findOne({
              where: { id: event.managerId },
              attributes: ['id', 'name', 'email']
            });
            
            if (artist) {
              // Buscar el perfil de artista asociado a este usuario
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
        
        // Crear una copia del evento para transformarlo
        const eventData = event.toJSON();
        
        // Añadir la información del artista si la encontramos
        if (artistInfo) {
          eventData.artist = artistInfo;
        }
        
        // Usar la función transformEvent para mantener consistencia
        const transformedEvent = transformEvent(eventData);
        
        // Asegurarnos de que fechaInicio y fechaFin estén presentes
        if (event.fechaProgramada && !transformedEvent.fechaInicio) {
          transformedEvent.fechaInicio = event.fechaProgramada.toISOString();
        }
        
        if (event.fechaProgramada && !transformedEvent.fechaFin) {
          // Añadir 2 horas por defecto para la duración del evento
          const fechaFin = new Date(event.fechaProgramada);
          fechaFin.setHours(fechaFin.getHours() + 2);
          transformedEvent.fechaFin = fechaFin.toISOString();
        }
        
        // Añadir campos adicionales específicos para este endpoint
        transformedEvent.estado = event.estado || 'pendiente';
        
        // Asegurarnos de que la información del espacio esté completa
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
    
    // Si no se encontró en la tabla Event, buscar en EventRequest
    try {
      const eventRequest = await EventRequest.findByPk(id);
      
      if (eventRequest) {
        console.log(`Solicitud de evento encontrada: ${eventRequest.titulo}`);
        
        // Buscar el espacio cultural asociado
        let space = null;
        if (eventRequest.spaceId) {
          space = await CulturalSpace.findByPk(eventRequest.spaceId, {
            attributes: ['id', 'nombre', 'direccion', 'latitude', 'longitude']
          });
        }
        
        // Buscar información del artista por separado
        let artist = null;
        if (eventRequest.artistId) {
          try {
            // Buscar el usuario
            const user = await User.findOne({
              where: { id: eventRequest.artistId },
              attributes: ['id', 'name', 'email']
            });
            
            if (user) {
              // Buscar el perfil de artista asociado a este usuario
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
            // Si hay un error, usar el ID como respaldo
            artist = {
              id: eventRequest.artistId,
              nombreArtistico: 'Artista'
            };

// Actualizar un evento de forma simple sin restricciones
exports.updateEventSimple = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Recibida solicitud para actualizar evento de forma simple:', id);
    console.log('Datos recibidos:', updateData);
    
    // Verificar que el evento exista
    const evento = await Event.findByPk(id);
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // Actualizar el evento con todos los datos proporcionados
    await evento.update(updateData);
    
    return res.status(200).json({
      success: true,
      message: 'Evento actualizado exitosamente',
      event: await Event.findByPk(id) // Devolver el evento actualizado
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
        
        // Crear fecha de inicio
        const fechaInicio = eventRequest.fecha && eventRequest.horaInicio 
          ? new Date(eventRequest.fecha + 'T' + eventRequest.horaInicio) 
          : null;
          
        // Crear fecha de fin
        const fechaFin = eventRequest.fecha && eventRequest.horaFin 
          ? new Date(eventRequest.fecha + 'T' + eventRequest.horaFin) 
          : null;
        
        // Transformar la solicitud al formato de evento
        const transformedEvent = {
          id: eventRequest.id,
          titulo: eventRequest.titulo || 'Sin título',
          descripcion: eventRequest.descripcion || 'Sin descripción',
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          fechaProgramada: fechaInicio, // Agregar fechaProgramada para compatibilidad con el frontend
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
    
    // Si no se encontró en ninguna de las tablas, devolver error
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

// Registrar un artista a un evento
exports.registerToEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { artistId } = req.body;
    
    // Verificar si el evento existe
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Evento no encontrado' 
      });
    }
    
    // Verificar si el artista ya está registrado
    const registeredArtists = event.registeredArtists || [];
    if (registeredArtists.includes(artistId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El artista ya está registrado en este evento' 
      });
    }
    
    // Verificar si hay capacidad disponible
    if (registeredArtists.length >= event.capacity) {
      return res.status(400).json({ 
        success: false, 
        message: 'El evento ha alcanzado su capacidad máxima' 
      });
    }
    
    // Registrar al artista
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

// Obtener artistas registrados en un evento
exports.getRegisteredArtists = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el evento existe
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Evento no encontrado' 
      });
    }
    
    // Obtener los IDs de artistas registrados
    const registeredArtistIds = event.registeredArtists || [];
    
    // Si no hay artistas registrados, devolver array vacío
    if (registeredArtistIds.length === 0) {
      return res.status(200).json({ 
        success: true, 
        artists: [] 
      });
    }
    
    // Buscar los datos de los artistas
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
