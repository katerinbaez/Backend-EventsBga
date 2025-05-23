const EventAttendance = require('../models/EventAttendance');
const Event = require('../models/Event');
const { User } = require('../models/User');
const { Artist } = require('../models/Artist'); // Importar el modelo Artist correctamente
const sequelize = require('../config/database'); // Corregir la importación de sequelize
const { Op } = require('sequelize'); // Importar los operadores de Sequelize
const EventRequest = require('../models/EventRequest'); // Importar el modelo EventRequest

// Obtener todos los eventos disponibles para artistas
exports.getAvailableEvents = async (req, res) => {
  try {
    // Obtener eventos programados
    const events = await Event.findAll({
      where: {
        estado: 'programado'
      },
      order: [['fechaProgramada', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error al obtener eventos disponibles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener eventos disponibles',
      error: error.message
    });
  }
};

// Confirmar asistencia a un evento
exports.confirmAttendance = async (req, res) => {
  try {
    const { eventId, artistId, userId, userName, isRegularUser } = req.body;
    let { artistName } = req.body;

    console.log('Datos recibidos para confirmar asistencia:', {
      eventId, artistId, userId, userName, artistName, isRegularUser
    });

    // Validar campos obligatorios
    if (!eventId || (!artistId && !userId)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para confirmar asistencia'
      });
    }

    // Verificar si el ID es un UUID (solicitud de evento) o un ID numérico (evento regular)
    const isUUID = typeof eventId === 'string' && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
    
    let event;
    
    if (isUUID) {
      // Es una solicitud de evento (EventRequest)
      console.log(`El ID ${eventId} es un UUID, buscando en EventRequests`);
      event = await EventRequest.findByPk(eventId);
    } else {
      // Es un evento regular (Event)
      console.log(`El ID ${eventId} es numérico, buscando en Events`);
      event = await Event.findByPk(eventId);
    }
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // Determinar si es un usuario regular o un artista
    const userIsRegular = isRegularUser || (userId && !artistId);
    
    if (userIsRegular) {
      // Es un usuario regular
      const attendeeId = userId || artistId; // Usar artistId como fallback si no hay userId
      const attendeeName = userName || 'Usuario';
      
      console.log('Procesando asistencia para usuario regular:', {
        attendeeId, attendeeName
      });

      // Para solicitudes de evento (UUID), crear un registro "virtual" de asistencia
      // ya que no se almacenan en la tabla EventAttendances
      if (isUUID) {
        console.log(`Creando registro virtual de asistencia para evento UUID ${eventId}`);
        
        // Verificar la capacidad del evento
        // Para EventRequests, el campo se llama asistentesEsperados
        if (event.asistentesEsperados) {
          // Aquí no podemos consultar la tabla EventAttendances ya que no almacena UUIDs
          // Pero podemos implementar una lógica para llevar un conteo en memoria o en otra tabla
          console.log(`Verificando capacidad: ${event.asistentesEsperados} asistentes esperados`);
          
          // Por ahora, asumimos que hay espacio disponible
          // En una implementación completa, se debería verificar contra una tabla específica para EventRequests
        }
        
        return res.status(200).json({
          success: true,
          message: 'Asistencia confirmada correctamente para solicitud de evento',
          attendance: {
            eventId,
            userId: attendeeId,
            userName: attendeeName,
            isRegularUser: true,
            status: 'confirmado',
            confirmationDate: new Date(),
            virtual: true // Indicador de que es un registro virtual
          }
        });
      }

      // Para eventos regulares, verificar si ya existe una confirmación
      const existingAttendance = await EventAttendance.findOne({
        where: {
          eventId,
          userId: attendeeId
        }
      });

      if (existingAttendance) {
        // Actualizar la confirmación existente
        existingAttendance.status = 'confirmado';
        existingAttendance.confirmationDate = new Date();
        await existingAttendance.save();

        return res.status(200).json({
          success: true,
          message: 'Asistencia actualizada correctamente',
          attendance: existingAttendance
        });
      }

      // Verificar la capacidad del evento antes de crear una nueva asistencia
      // Para eventos regulares, podemos consultar directamente la tabla EventAttendances
      const currentAttendees = await EventAttendance.count({
        where: {
          eventId,
          status: 'confirmado'
        }
      });
      
      console.log(`Verificando capacidad para evento ${eventId}: ${currentAttendees}/${event.asistentesEsperados} asistentes`);
      
      if (event.asistentesEsperados && currentAttendees >= event.asistentesEsperados) {
        return res.status(400).json({
          success: false,
          message: 'El evento ha alcanzado su capacidad máxima de asistentes',
          capacityExceeded: true
        });
      }

      // Crear nueva confirmación para usuario regular
      const newAttendance = await EventAttendance.create({
        eventId,
        userId: attendeeId,
        userName: attendeeName,
        isRegularUser: true,
        status: 'confirmado',
        confirmationDate: new Date(),
        artistId: null,
        artistName: null
      });

      return res.status(201).json({
        success: true,
        message: 'Asistencia confirmada correctamente',
        attendance: newAttendance
      });
    } else {
      // Es un artista
      // Buscar el perfil del artista para obtener el nombre artístico
      console.log('Procesando asistencia para artista:', {
        artistId, artistName
      });
      
      try {
        // Buscar directamente en el modelo Artist usando el userId
        console.log('Buscando perfil de artista con userId:', artistId);
        
        // Intentar buscar el perfil exactamente como viene
        let artistProfile = await Artist.findOne({
          where: { userId: artistId }
        });
        
        // Si no se encuentra, intentar buscar con el formato de Auth0
        if (!artistProfile && !artistId.includes('|')) {
          console.log('Intentando buscar con formato Auth0 alternativo');
          // Intentar con formatos comunes de Auth0
          const possibleFormats = [
            `auth0|${artistId}`,
            `google-oauth2|${artistId}`,
            `facebook|${artistId}`
          ];
          
          for (const format of possibleFormats) {
            const tempProfile = await Artist.findOne({
              where: { userId: format }
            });
            
            if (tempProfile) {
              artistProfile = tempProfile;
              console.log('Perfil encontrado con formato alternativo:', format);
              break;
            }
          }
        }
        
        console.log('Perfil de artista encontrado:', artistProfile ? {
          id: artistProfile.id,
          userId: artistProfile.userId,
          nombreArtistico: artistProfile.nombreArtistico
        } : 'No encontrado');
        
        if (artistProfile && artistProfile.nombreArtistico) {
          artistName = artistProfile.nombreArtistico;
          console.log('Usando nombre artístico del perfil:', artistName);
        } else if (!artistName) {
          // Si no se proporcionó artistName y no se encontró perfil, usar un valor predeterminado
          artistName = 'Artista';
          console.log('Usando nombre predeterminado:', artistName);
        }
      } catch (profileError) {
        console.error('Error al buscar perfil de artista:', profileError);
        // Continuar con el nombre proporcionado o predeterminado
        if (!artistName) artistName = 'Artista';
      }

      // Verificar si ya existe una confirmación para este artista y evento
      const existingAttendance = await EventAttendance.findOne({
        where: {
          eventId,
          artistId
        }
      });

      if (existingAttendance) {
        // Actualizar la confirmación existente
        existingAttendance.status = 'confirmado';
        existingAttendance.confirmationDate = new Date();
        await existingAttendance.save();

        return res.status(200).json({
          success: true,
          message: 'Asistencia actualizada correctamente',
          attendance: existingAttendance
        });
      }

      // Verificar la capacidad del evento antes de crear una nueva asistencia
      // Para eventos regulares, podemos consultar directamente la tabla EventAttendances
      const currentAttendees = await EventAttendance.count({
        where: {
          eventId,
          status: 'confirmado'
        }
      });
      
      console.log(`Verificando capacidad para evento ${eventId}: ${currentAttendees}/${event.asistentesEsperados} asistentes`);
      
      if (event.asistentesEsperados && currentAttendees >= event.asistentesEsperados) {
        return res.status(400).json({
          success: false,
          message: 'El evento ha alcanzado su capacidad máxima de asistentes',
          capacityExceeded: true
        });
      }

      // Crear nueva confirmación para artista
      const newAttendance = await EventAttendance.create({
        eventId,
        artistId,
        artistName,
        isRegularUser: false,
        status: 'confirmado',
        confirmationDate: new Date()
      });

      return res.status(201).json({
        success: true,
        message: 'Asistencia confirmada correctamente',
        attendance: newAttendance
      });
    }
  } catch (error) {
    console.error('Error al confirmar asistencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al confirmar asistencia',
      error: error.message
    });
  }
};

// Cancelar asistencia a un evento
exports.cancelAttendance = async (req, res) => {
  try {
    const { eventId, artistId, userId, isRegularUser } = req.body;

    console.log('Datos recibidos para cancelar asistencia:', {
      eventId, artistId, userId, isRegularUser
    });

    // Validar campos obligatorios
    if (!eventId || (!artistId && !userId)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para cancelar asistencia'
      });
    }

    // Verificar si el evento existe
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    // Determinar si es un usuario regular o un artista
    const userIsRegular = isRegularUser || (userId && !artistId);
    const attendeeId = userIsRegular ? userId : artistId;
    
    console.log('Tipo de asistente para cancelación:', userIsRegular ? 'Usuario regular' : 'Artista', 'con ID:', attendeeId);
    
    // Buscar la asistencia según el tipo de usuario
    let attendance;
    if (userIsRegular) {
      attendance = await EventAttendance.findOne({
        where: {
          eventId,
          userId: attendeeId
        }
      });
      
      console.log('Resultado de búsqueda para cancelación de usuario regular:', attendance ? 'Encontrado' : 'No encontrado');
    } else {
      attendance = await EventAttendance.findOne({
        where: {
          eventId,
          artistId: attendeeId
        }
      });
      
      console.log('Resultado de búsqueda para cancelación de artista:', attendance ? 'Encontrado' : 'No encontrado');
    }

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró registro de asistencia para este evento'
      });
    }

    // Actualizar el estado de la asistencia
    attendance.status = 'cancelado';
    await attendance.save();

    return res.status(200).json({
      success: true,
      message: 'Asistencia cancelada correctamente',
      attendance
    });
  } catch (error) {
    console.error('Error al cancelar asistencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cancelar asistencia',
      error: error.message
    });
  }
};

// Obtener artistas confirmados para un evento
exports.getConfirmedArtists = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validar que se proporcionó un ID de evento
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del evento'
      });
    }

    // Buscar todas las asistencias confirmadas para el evento que sean de artistas
    const attendances = await EventAttendance.findAll({
      where: {
        eventId,
        status: 'confirmado',
        isRegularUser: false
      },
      order: [['confirmationDate', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      attendances
    });
  } catch (error) {
    console.error('Error al obtener artistas confirmados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener artistas confirmados',
      error: error.message
    });
  }
};

// Obtener usuarios regulares confirmados para un evento
exports.getConfirmedUsers = async (req, res) => {
  try {
    const { eventId } = req.params;

    console.log('Obteniendo usuarios confirmados para el evento:', eventId);

    // Validar que se proporcionó un ID de evento
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del evento'
      });
    }

    // Buscar todas las asistencias confirmadas para el evento que sean de usuarios regulares
    const attendances = await EventAttendance.findAll({
      where: {
        eventId,
        status: 'confirmado',
        userId: {
          [Op.ne]: null // Usar Op.ne en lugar de sequelize.Op.ne
        }
      },
      order: [['confirmationDate', 'DESC']]
    });

    console.log(`Se encontraron ${attendances.length} usuarios confirmados para el evento ${eventId}`);

    // Formatear los datos para la respuesta
    const formattedAttendances = attendances.map(attendance => {
      return {
        id: attendance.id,
        eventId: attendance.eventId,
        userId: attendance.userId,
        userName: attendance.userName || 'Usuario',
        confirmationDate: attendance.confirmationDate,
        status: attendance.status,
        isRegularUser: true
      };
    });

    return res.status(200).json({
      success: true,
      attendances: formattedAttendances
    });
  } catch (error) {
    console.error('Error al obtener usuarios confirmados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios confirmados',
      error: error.message
    });
  }
};

// Verificar si un usuario o artista está confirmado para un evento
exports.checkAttendance = async (req, res) => {
  try {
    const { eventId, userId, artistId } = req.query;
    
    console.log('Verificando asistencia:', { eventId, userId, artistId });

    // Validar campos obligatorios
    if (!eventId || (!userId && !artistId)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros obligatorios'
      });
    }

    // Determinar si es un usuario regular o un artista
    const isUserRegular = userId && !artistId;
    const attendeeId = isUserRegular ? userId : artistId;
    
    console.log('Tipo de asistente:', isUserRegular ? 'Usuario regular' : 'Artista', 'con ID:', attendeeId);
    
    // Buscar la asistencia según el tipo de usuario
    let attendance;
    if (isUserRegular) {
      // Buscar por userId para usuarios regulares
      attendance = await EventAttendance.findOne({
        where: {
          eventId,
          userId: attendeeId,
          status: 'confirmado'
        }
      });
      
      console.log('Resultado de búsqueda para usuario regular:', attendance ? 'Encontrado' : 'No encontrado');
    } else {
      // Buscar por artistId para artistas
      attendance = await EventAttendance.findOne({
        where: {
          eventId,
          artistId: attendeeId,
          status: 'confirmado'
        }
      });
      
      console.log('Resultado de búsqueda para artista:', attendance ? 'Encontrado' : 'No encontrado');
    }

    return res.status(200).json({
      success: true,
      isAttending: !!attendance
    });
  } catch (error) {
    console.error('Error al verificar asistencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar asistencia',
      error: error.message
    });
  }
};

// Obtener el conteo de asistentes para un evento específico
exports.getAttendanceCount = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    console.log('Obteniendo conteo de asistentes para el evento:', eventId);

    // Validar que se proporcionó un ID de evento
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del evento'
      });
    }

    // Verificar si el ID es un UUID (solicitud de evento) o un ID numérico (evento regular)
    const isUUID = typeof eventId === 'string' && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
    
    // Si es un UUID, devolver 0 ya que las solicitudes de eventos no tienen asistencias en la tabla EventAttendances
    if (isUUID) {
      console.log(`El evento ${eventId} es una solicitud de evento (UUID), no tiene asistencias registradas en la tabla EventAttendances`);
      return res.status(200).json({
        success: true,
        count: 0,
        details: {
          artists: 0,
          users: 0
        }
      });
    }
    
    // Intentar convertir el eventId a número para asegurarnos de que es un entero
    const numericEventId = parseInt(eventId, 10);
    if (isNaN(numericEventId)) {
      console.log(`El ID de evento ${eventId} no es un número válido ni un UUID reconocido`);
      return res.status(200).json({
        success: true,
        count: 0,
        details: {
          artists: 0,
          users: 0
        }
      });
    }
    
    // Para eventos regulares (con IDs numéricos), contar asistencias
    // Contar asistencias confirmadas para el evento (tanto artistas como usuarios regulares)
    const artistsCount = await EventAttendance.count({
      where: {
        eventId: numericEventId,
        status: 'confirmado',
        artistId: {
          [Op.ne]: null
        }
      }
    });
    
    const usersCount = await EventAttendance.count({
      where: {
        eventId: numericEventId,
        status: 'confirmado',
        userId: {
          [Op.ne]: null
        },
        artistId: null // Para asegurarnos de que son usuarios regulares
      }
    });
    
    const totalCount = artistsCount + usersCount;
    
    console.log(`Conteo de asistentes para el evento ${eventId}:`, {
      artistas: artistsCount,
      usuarios: usersCount,
      total: totalCount
    });

    return res.status(200).json({
      success: true,
      count: totalCount,
      details: {
        artists: artistsCount,
        users: usersCount
      }
    });
  } catch (error) {
    console.error('Error al obtener conteo de asistentes:', error);
    
    // Devolver un conteo de 0 en caso de error para no interrumpir el flujo
    return res.status(200).json({
      success: true,
      count: 0,
      details: {
        artists: 0,
        users: 0
      },
      error: error.message
    });
  }
};
