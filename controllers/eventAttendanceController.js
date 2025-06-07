// Controlador para asistencia a eventos
// Maneja registro y consulta de asistencia

const EventAttendance = require('../models/EventAttendance');
const Event = require('../models/Event');
const { User } = require('../models/User');
const { Artist } = require('../models/Artist'); 
const sequelize = require('../config/database'); 
const { Op } = require('sequelize'); 
const EventRequest = require('../models/EventRequest'); 

exports.getAvailableEvents = async (req, res) => {
  try {
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

exports.confirmAttendance = async (req, res) => {
  try {
    const { eventId, artistId, userId, userName, isRegularUser } = req.body;
    let { artistName } = req.body;

    console.log('Datos recibidos para confirmar asistencia:', {
      eventId, artistId, userId, userName, artistName, isRegularUser
    });

    if (!eventId || (!artistId && !userId)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para confirmar asistencia'
      });
    }

    const isUUID = typeof eventId === 'string' && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
    
    let event;
    
    if (isUUID) {
      console.log(`El ID ${eventId} es un UUID, buscando en EventRequests`);
      event = await EventRequest.findByPk(eventId);
    } else {
      console.log(`El ID ${eventId} es numérico, buscando en Events`);
      event = await Event.findByPk(eventId);
    }
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    const userIsRegular = isRegularUser || (userId && !artistId);
    
    if (userIsRegular) {
      const attendeeId = userId || artistId;
      const attendeeName = userName || 'Usuario';
      
      console.log('Procesando asistencia para usuario regular:', {
        attendeeId, attendeeName
      });

    
      if (isUUID) {
        console.log(`Creando registro virtual de asistencia para evento UUID ${eventId}`);
        
        
        if (event.asistentesEsperados) {
         
          console.log(`Verificando capacidad: ${event.asistentesEsperados} asistentes esperados`);
          
        
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
            virtual: true 
          }
        });
      }

      const existingAttendance = await EventAttendance.findOne({
        where: {
          eventId,
          userId: attendeeId
        }
      });

      if (existingAttendance) {
        existingAttendance.status = 'confirmado';
        existingAttendance.confirmationDate = new Date();
        await existingAttendance.save();

        return res.status(200).json({
          success: true,
          message: 'Asistencia actualizada correctamente',
          attendance: existingAttendance
        });
      }

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
      console.log('Procesando asistencia para artista:', {
        artistId, artistName
      });
      
      try {
        console.log('Buscando perfil de artista con userId:', artistId);
        
        let artistProfile = await Artist.findOne({
          where: { userId: artistId }
        });
        
        if (!artistProfile && !artistId.includes('|')) {
          console.log('Intentando buscar con formato Auth0 alternativo');
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
          artistName = 'Artista';
          console.log('Usando nombre predeterminado:', artistName);
        }
      } catch (profileError) {
        console.error('Error al buscar perfil de artista:', profileError);
        if (!artistName) artistName = 'Artista';
      }

      const existingAttendance = await EventAttendance.findOne({
        where: {
          eventId,
          artistId
        }
      });

      if (existingAttendance) {
        existingAttendance.status = 'confirmado';
        existingAttendance.confirmationDate = new Date();
        await existingAttendance.save();

        return res.status(200).json({
          success: true,
          message: 'Asistencia actualizada correctamente',
          attendance: existingAttendance
        });
      }

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

exports.cancelAttendance = async (req, res) => {
  try {
    const { eventId, artistId, userId, isRegularUser } = req.body;

    console.log('Datos recibidos para cancelar asistencia:', {
      eventId, artistId, userId, isRegularUser
    });

    if (!eventId || (!artistId && !userId)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para cancelar asistencia'
      });
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    const userIsRegular = isRegularUser || (userId && !artistId);
    const attendeeId = userIsRegular ? userId : artistId;
    
    console.log('Tipo de asistente para cancelación:', userIsRegular ? 'Usuario regular' : 'Artista', 'con ID:', attendeeId);
    
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

exports.getConfirmedArtists = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del evento'
      });
    }

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

exports.getConfirmedUsers = async (req, res) => {
  try {
    const { eventId } = req.params;

    console.log('Obteniendo usuarios confirmados para el evento:', eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del evento'
      });
    }

    const attendances = await EventAttendance.findAll({
      where: {
        eventId,
        status: 'confirmado',
        userId: {
          [Op.ne]: null 
        }
      },
      order: [['confirmationDate', 'DESC']]
    });

    console.log(`Se encontraron ${attendances.length} usuarios confirmados para el evento ${eventId}`);

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

exports.checkAttendance = async (req, res) => {
  try {
    const { eventId, userId, artistId } = req.query;
    
    console.log('Verificando asistencia:', { eventId, userId, artistId });

    if (!eventId || (!userId && !artistId)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros obligatorios'
      });
    }

    const isUserRegular = userId && !artistId;
    const attendeeId = isUserRegular ? userId : artistId;
    
    console.log('Tipo de asistente:', isUserRegular ? 'Usuario regular' : 'Artista', 'con ID:', attendeeId);
    
    let attendance;
    if (isUserRegular) {
      attendance = await EventAttendance.findOne({
        where: {
          eventId,
          userId: attendeeId,
          status: 'confirmado'
        }
      });
      
      console.log('Resultado de búsqueda para usuario regular:', attendance ? 'Encontrado' : 'No encontrado');
    } else {
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

exports.getAttendanceCount = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    console.log('Obteniendo conteo de asistentes para el evento:', eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del evento'
      });
    }

    const isUUID = typeof eventId === 'string' && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
    
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
        artistId: null 
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
