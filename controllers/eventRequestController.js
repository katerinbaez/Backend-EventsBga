// Controlador de solicitudes de eventos
// Maneja operaciones CRUD y transformaciones de solicitudes de eventos

const EventRequest = require('../models/EventRequest');
const { User } = require('../models/User');
const CulturalSpace = require('../models/CulturalSpace');
const sequelize = require('../config/database');

const transformEventRequest = (request, includeAssociations = true) => {
  if (!request || typeof request !== 'object') {
    console.error('Solicitud inválida para transformar:', request);
    return null;
  }
  
  const transformed = {
    id: request.id,
    eventName: request.titulo || 'Sin título',
    description: request.descripcion || '',
    date: request.fecha || new Date().toISOString().split('T')[0],
    startTime: request.horaInicio || '00:00:00',
    endTime: request.horaFin || '00:00:00',
    duration: request.duracionHoras || 0,
    expectedAttendees: request.asistentesEsperados || 0,
    eventType: request.tipoEvento || '',
    category: request.categoria || '',
    additionalRequirements: request.requerimientosAdicionales || '',
    status: request.estado || 'pendiente',
    artistId: request.artistId || '',
    managerId: request.managerId || '',
    spaceId: request.spaceId || '',
    rejectionReason: request.rejectionReason || '',
    createdAt: request.createdAt || new Date(),
    updatedAt: request.updatedAt || new Date()
  };
  
  if (includeAssociations) {
    transformed.artistName = request.artist ? request.artist.name : 'Artista';
    transformed.managerName = request.manager ? request.manager.name : 'Gestor';
    transformed.spaceName = request.space ? request.space.nombre : 'Espacio Cultural';
    transformed.spaceAddress = request.space ? request.space.direccion : '';
  } else {
    transformed.artistName = 'Artista';
    transformed.managerName = 'Gestor';
    transformed.spaceName = 'Espacio Cultural';
    transformed.spaceAddress = '';
  }
  
  return transformed;
};

exports.getAllEventRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let whereClause = {};
    
    if (userRole === 'artist') {
      whereClause.artistId = userId;
    } else if (userRole === 'manager') {
      whereClause.managerId = userId;
    }
    
    const eventRequests = await EventRequest.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'artist',
          attributes: ['id', 'name', 'email', 'profileImage']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email', 'profileImage']
        },
        {
          model: CulturalSpace,
          as: 'space',
          attributes: ['id', 'nombreEspacio', 'direccion', 'images']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      eventRequests: eventRequests.map(transformEventRequest)
    });
  } catch (error) {
    console.error('Error al obtener solicitudes de eventos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las solicitudes de eventos',
      error: error.message
    });
  }
};

exports.getEventRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const eventRequest = await EventRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'artist',
          attributes: ['id', 'name', 'email', 'profileImage']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email', 'profileImage']
        },
        {
          model: CulturalSpace,
          as: 'space',
          attributes: ['id', 'nombreEspacio', 'direccion', 'images']
        }
      ]
    });
    
    if (!eventRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de evento no encontrada'
      });
    }
    
    const userId = req.user.id;
    if (eventRequest.artistId !== userId && eventRequest.managerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver esta solicitud'
      });
    }
    
    return res.status(200).json({
      success: true,
      eventRequest: transformEventRequest(eventRequest)
    });
  } catch (error) {
    console.error('Error al obtener solicitud de evento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la solicitud de evento',
      error: error.message
    });
  }
};

exports.createEventRequest = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error('Error de autenticación: Usuario no identificado');
      return res.status(401).json({
        success: false,
        message: 'Error de autenticación: No se pudo identificar al usuario',
        code: 'AUTH_ERROR'
      });
    }
    
    if (req.user.role !== 'artist' && req.user.role !== 'admin') {
      console.error(`Error de permisos: Usuario con rol ${req.user.role} intentando crear solicitud`);
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear solicitudes de eventos. Se requiere rol de artista.',
        code: 'PERMISSION_ERROR'
      });
    }
    
    const {
      managerId,
      spaceId,
      titulo,
      descripcion,
      fecha,
      horaInicio,
      horaFin,
      asistentesEsperados,
      tipoEvento,
      categoria,
      requerimientosAdicionales
    } = req.body;
    
    if (!managerId || !spaceId || !titulo || !fecha || !horaInicio || !horaFin) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para crear la solicitud',
        requiredFields: ['managerId', 'spaceId', 'titulo', 'fecha', 'horaInicio', 'horaFin']
      });
    }
    
    const artistId = req.user.id;
    
    console.log('Creando solicitud de evento con datos validados:', {
      artistId,
      managerId,
      spaceId,
      titulo,
      fecha
    });
    
    const eventRequest = await EventRequest.create({
      artistId,
      managerId,
      spaceId,
      titulo,
      descripcion,
      fecha,
      horaInicio,
      horaFin,
      asistentesEsperados,
      tipoEvento,
      categoria,
      requerimientosAdicionales,
      estado: 'pendiente'
    });
    
    console.log('Solicitud creada exitosamente con ID:', eventRequest.id);
    
    return res.status(201).json({
      success: true,
      message: 'Solicitud de evento creada exitosamente',
      eventRequest
    });
  } catch (error) {
    console.error('Error al crear solicitud de evento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la solicitud de evento',
      error: error.message
    });
  }
};

exports.updateEventRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    if (!['pendiente', 'aprobado', 'rechazado'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido'
      });
    }
    
    const eventRequest = await EventRequest.findByPk(id);
    
    if (!eventRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de evento no encontrada'
      });
    }
    
    if (eventRequest.managerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar esta solicitud'
      });
    }
    
    if (status === 'rechazado' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un motivo de rechazo'
      });
    }
    
    eventRequest.status = status;
    if (status === 'rechazado') {
      eventRequest.rejectionReason = rejectionReason;
    }
    
    await eventRequest.save();
    
    return res.status(200).json({
      success: true,
      message: `Solicitud de evento ${status === 'aprobado' ? 'aprobada' : 'rechazada'} correctamente`,
      eventRequest
    });
  } catch (error) {
    console.error('Error al actualizar estado de solicitud:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado de la solicitud',
      error: error.message
    });
  }
};

exports.createEventRequestWithoutToken = async (req, res) => {
  try {
    console.log('Recibida solicitud para crear evento sin token:', req.body);
    
    const { artistId, managerId, spaceId, titulo, descripcion, fecha, horaInicio, horaFin, asistentesEsperados, tipoEvento, categoria, requerimientosAdicionales } = req.body;
    
    if (!artistId || !managerId || !spaceId || !titulo || !descripcion || !fecha || !horaInicio || !horaFin) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos obligatorios para crear la solicitud'
      });
    }
    
    const artist = await User.findByPk(artistId);
    if (!artist) {
      console.log(`No se encontró el artista con ID: ${artistId}`);
      return res.status(404).json({
        success: false,
        message: 'No se encontró el artista especificado'
      });
    }
    
    const manager = await User.findByPk(managerId);
    if (!manager) {
      console.log(`No se encontró el gestor con ID: ${managerId}`);
      return res.status(404).json({
        success: false,
        message: 'No se encontró el gestor especificado'
      });
    }
    
    const space = await CulturalSpace.findByPk(spaceId);
    if (!space) {
      console.log(`No se encontró el espacio cultural con ID: ${spaceId}`);
      return res.status(404).json({
        success: false,
        message: 'No se encontró el espacio cultural especificado'
      });
    }
    
    const metadatos = {
      artistEmail: req.body.artistEmail || artist.email || 'No disponible',
      spaceName: req.body.spaceName || space.nombre || 'Espacio Cultural',
      spaceAddress: req.body.spaceAddress || space.direccion || '',
    };
    
    const eventRequest = await EventRequest.create({
      artistId,
      managerId,
      spaceId,
      titulo,
      descripcion,
      fecha,
      horaInicio,
      horaFin,
      duracionHoras: req.body.duracionHoras || 1,
      asistentesEsperados: asistentesEsperados || 0,
      tipoEvento: tipoEvento || 'No especificado',
      categoria: categoria || 'otro',
      requerimientosAdicionales: requerimientosAdicionales || 'Ninguno',
      estado: 'pendiente',
      metadatos: JSON.stringify(metadatos)
    });
    
    console.log('Solicitud creada exitosamente con ID:', eventRequest.id);
    
    return res.status(201).json({
      success: true,
      message: 'Solicitud de evento creada exitosamente',
      eventRequest
    });
  } catch (error) {
    console.error('Error al crear solicitud de evento sin token:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la solicitud de evento',
      error: error.message
    });
  }
};

exports.getArtistRequestsWithoutToken = async (req, res) => {
  try {
    const { artistId } = req.params;
    
    if (!artistId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del artista'
      });
    }
    
    console.log('Buscando solicitudes para el artista:', artistId);
    
    try {
      console.log('Ejecutando consulta SQL directa');
      const tableName = EventRequest.getTableName();
      console.log(`Nombre real de la tabla: ${tableName}`);
      
      const results = await sequelize.query(
        `SELECT * FROM "${tableName}" WHERE "artistId" = :artistId ORDER BY "createdAt" DESC`,
        {
          replacements: { artistId },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      const requests = Array.isArray(results) ? results : [results].filter(r => r);
      console.log(`Encontradas ${requests.length} solicitudes en consulta SQL directa`);
      console.log('Solicitudes encontradas:', JSON.stringify(requests[0], null, 2));
      
      if (!requests || requests.length === 0) {
        console.log('No se encontraron solicitudes para el artista:', artistId);
        return res.status(200).json({
          success: true,
          message: 'No se encontraron solicitudes para este artista',
          requests: []
        });
      }
      
      console.log('Solicitudes encontradas:', JSON.stringify(requests, null, 2));
      
      const spaceIds = [];
      for (const req of requests) {
        if (req.spaceId && !spaceIds.includes(req.spaceId)) {
          spaceIds.push(req.spaceId);
        }
      }
      
      console.log('IDs de espacios a buscar:', spaceIds);
      
      const spacesMap = {};
      
      for (const spaceId of spaceIds) {
        try {
          console.log(`Buscando espacio cultural con ID: ${spaceId}`);
          
          const space = await CulturalSpace.findByPk(spaceId);
          
          if (space) {
            console.log(`Espacio encontrado con Sequelize: ${space.nombre}`);
            spacesMap[spaceId] = {
              id: space.id,
              nombre: space.nombre,
              direccion: space.direccion || ''
            };
          } else {
            const [spaceResults] = await sequelize.query(
              `SELECT id, nombre, direccion FROM CulturalSpaces WHERE id = :spaceId LIMIT 1`,
              {
                replacements: { spaceId },
                type: sequelize.QueryTypes.SELECT
              }
            );
            
            if (spaceResults && spaceResults.length > 0) {
              const spaceData = spaceResults[0];
              console.log(`Espacio encontrado con SQL: ${spaceData.nombre}`);
              spacesMap[spaceId] = {
                id: spaceData.id,
                nombre: spaceData.nombre,
                direccion: spaceData.direccion || ''
              };
            } else {
              console.log(`No se encontró espacio con ID: ${spaceId}`);
            }
          }
        } catch (error) {
          console.error(`Error al buscar espacio con ID ${spaceId}:`, error);
        }
      }
      
      console.log('Mapa de espacios creado:', JSON.stringify(spacesMap, null, 2));
      
      const validRequests = requests.map(request => {
        const space = spacesMap[request.spaceId] || { nombre: 'Espacio Cultural', direccion: '' };
        
        let metadatos = {};
        try {
          if (request.metadatos) {
            metadatos = JSON.parse(request.metadatos);
            console.log(`Metadatos encontrados para solicitud ${request.id}:`, metadatos);
          }
        } catch (error) {
          console.error(`Error al parsear metadatos de solicitud ${request.id}:`, error);
          metadatos = {};
        }
        
        return {
          id: request.id,
          eventName: request.titulo || 'Sin título',
          description: request.descripcion || '',
          date: request.fecha || new Date().toISOString().split('T')[0],
          startTime: request.horaInicio || '00:00:00',
          endTime: request.horaFin || '00:00:00',
          duration: request.duracionHoras || 0,
          expectedAttendees: request.asistentesEsperados || 0,
          eventType: request.tipoEvento || '',
          category: request.categoria || '',
          additionalRequirements: request.requerimientosAdicionales || '',
          status: request.estado || 'pendiente',
          artistId: request.artistId || '',
          managerId: request.managerId || '',
          spaceId: request.spaceId || '',
          rejectionReason: request.rejectionReason || '',
          createdAt: request.createdAt || new Date(),
          updatedAt: request.updatedAt || new Date(),
          spaceName: metadatos.spaceName || space.nombre || 'Espacio Cultural',
          spaceAddress: metadatos.spaceAddress || space.direccion || '',
          metadatos: request.metadatos || '',
          artistName: 'Artista',
          managerName: 'Gestor'
        };
      });
      
      console.log(`Se encontraron ${validRequests.length} solicitudes válidas para el artista ${artistId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Solicitudes obtenidas exitosamente',
        requests: validRequests
      });
    } catch (sqlError) {
      console.error('Error en consulta SQL directa:', sqlError);
      console.log('Intentando con consulta Sequelize simple');
      const requests = await EventRequest.findAll({
        where: {
          artistId: artistId
        },
        order: [['createdAt', 'DESC']]
      });
      
      console.log(`Encontradas ${requests ? requests.length : 0} solicitudes en consulta Sequelize`);
      
      if (!requests || requests.length === 0) {
        console.log('No se encontraron solicitudes para el artista:', artistId);
        return res.status(200).json({
          success: true,
          message: 'No se encontraron solicitudes para este artista',
          requests: []
        });
      }
      
      const transformedRequests = requests.map(request => transformEventRequest(request, false));
      
      const validRequests = transformedRequests.filter(req => req !== null);
      
      console.log(`Se encontraron ${validRequests.length} solicitudes válidas para el artista ${artistId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Solicitudes obtenidas exitosamente',
        requests: validRequests
      });
    }
  } catch (error) {
    console.error('Error al obtener solicitudes del artista sin token:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las solicitudes del artista',
      error: error.message
    });
  }
};
