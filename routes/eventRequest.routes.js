// Rutas de solicitudes de eventos
// Gestiona la creación, aprobación y rechazo de solicitudes de eventos

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const EventRequest = require('../models/EventRequest');
const User = require('../models/User');
const CulturalSpace = require('../models/CulturalSpace');
const { Op } = require('sequelize');
const eventRequestController = require('../controllers/eventRequestController');
const sequelize = require('../config/database');

router.get('/', authenticateToken, async (req, res) => {
  try {
    let userId = null;
    let userRole = null;
    
    if (req.auth) {
      userId = req.auth.id;
      userRole = req.auth.role;
    } else if (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email'] === 'admin@eventsbga.com') {
      userRole = 'admin';
    }
    
    let query = {};
    
    if (userRole === 'artist' && userId) {
      query.artistId = userId;
    } 
    else if (userRole === 'manager' && userId) {
      query.managerId = userId;
    }
    else if (!userRole || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estas solicitudes'
      });
    }
    
    const eventRequests = await EventRequest.findAll({
      where: query,
      include: [
        {
          model: User,
          as: 'artist',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email']
        },
        {
          model: CulturalSpace,
          as: 'space',
          attributes: ['id', 'nombreEspacio', 'direccion', 'capacidad']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.status(200).json({ 
      success: true, 
      eventRequests 
    });
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las solicitudes de eventos',
      error: error.message
    });
  }
});

router.get('/manager/:managerId', authenticateToken, async (req, res) => {
  try {
    const { managerId } = req.params;
    
    let userId = null;
    let userRole = null;
    
    if (req.auth) {
      userId = req.auth.id;
      userRole = req.auth.role;
    } else if (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email'] === 'admin@eventsbga.com') {
      userRole = 'admin';
    }
    
    if (!userRole || (userRole !== 'admin' && userId !== managerId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para ver estas solicitudes' 
      });
    }
    
    const requests = await EventRequest.findAll({
      where: { managerId },
      include: [
        {
          model: User,
          as: 'artist',
          attributes: ['id', 'name', 'email']
        },
        {
          model: CulturalSpace,
          as: 'space',
          attributes: ['id', 'nombreEspacio', 'direccion', 'capacidad']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.status(200).json({ 
      success: true, 
      requests 
    });
  } catch (error) {
    console.error('Error al obtener solicitudes del gestor:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las solicitudes',
      error: error.message
    });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    let userId = null;
    let userRole = null;
    
    if (req.auth) {
      userId = req.auth.id;
      userRole = req.auth.role;
    } else if (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email'] === 'admin@eventsbga.com') {
      userRole = 'admin';
    }
    
    const eventRequest = await EventRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'artist',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email']
        },
        {
          model: CulturalSpace,
          as: 'space',
          attributes: ['id', 'nombreEspacio', 'direccion', 'capacidad']
        }
      ]
    });
    
    if (!eventRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Solicitud no encontrada' 
      });
    }
    
    if (
      !userRole || 
      (userRole !== 'admin' && 
      (!userId || (userId !== eventRequest.artistId && userId !== eventRequest.managerId)))
    ) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para ver esta solicitud' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      eventRequest 
    });
  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener la solicitud',
      error: error.message
    });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    let userId = null;
    let userRole = null;
    
    if (req.auth) {
      userId = req.auth.id;
      userRole = req.auth.role;
    } else if (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email'] === 'admin@eventsbga.com') {
      userRole = 'admin';
    } else if (req.headers['x-user-role'] === 'artist' && req.headers['x-user-id']) {
      userId = req.headers['x-user-id'];
      userRole = 'artist';
      console.log('Usando headers personalizados para autenticación:', { userId, userRole });
    }
    
    if (!userRole || (userRole !== 'artist' && userRole !== 'admin')) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para crear solicitudes de eventos' 
      });
    }
    
    const { 
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
      categoriaPersonalizada,
      requerimientosAdicionales 
    } = req.body;
    
    if (userRole !== 'admin' && !userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'No se puede identificar al usuario' 
      });
    }
    
    
    const eventRequest = await EventRequest.create({
      artistId: artistId || userId,
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
      categoriaPersonalizada,
      requerimientosAdicionales,
      estado: 'pendiente'
    });
    
    return res.status(201).json({ 
      success: true, 
      message: 'Solicitud creada exitosamente', 
      eventRequest 
    });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al crear la solicitud de evento',
      error: error.message
    });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    let userId = null;
    let userRole = null;
    
    if (req.auth) {
      userId = req.auth.id;
      userRole = req.auth.role;
    } else if (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email'] === 'admin@eventsbga.com') {
      userRole = 'admin';
    }
    
    const { estado, rejectionReason } = req.body;
    
    const eventRequest = await EventRequest.findByPk(id);
    
    if (!eventRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Solicitud no encontrada' 
      });
    }
    
    if (!userRole || (userRole !== 'admin' && (!userId || userId !== eventRequest.managerId))) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para actualizar esta solicitud' 
      });
    }
    
    eventRequest.estado = estado;
    
    if (estado === 'rechazado' && rejectionReason) {
      eventRequest.rejectionReason = rejectionReason;
    }
    
    await eventRequest.save();
    
    return res.status(200).json({ 
      success: true, 
      message: `Solicitud ${estado === 'aprobado' ? 'aprobada' : 'rechazada'} exitosamente`, 
      eventRequest 
    });
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar la solicitud',
      error: error.message
    });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    let userId = null;
    let userRole = null;
    
    if (req.auth) {
      userId = req.auth.id;
      userRole = req.auth.role;
    } else if (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email'] === 'admin@eventsbga.com') {
      userRole = 'admin';
    }
    
    const eventRequest = await EventRequest.findByPk(id);
    
    if (!eventRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Solicitud no encontrada' 
      });
    }
    
    if (
      !userRole ||
      (userRole !== 'admin' && 
      (!userId || userId !== eventRequest.artistId || eventRequest.estado !== 'pendiente'))
    ) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para eliminar esta solicitud o ya ha sido procesada' 
      });
    }
    
    await eventRequest.destroy();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Solicitud eliminada exitosamente' 
    });
  } catch (error) {
    console.error('Error al eliminar solicitud:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar la solicitud',
      error: error.message
    });
  }
});

router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    let userId = null;
    let userRole = null;
    
    if (req.auth) {
      userId = req.auth.id;
      userRole = req.auth.role;
    } else if (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email'] === 'admin@eventsbga.com') {
      userRole = 'admin';
    }
    
    const eventRequest = await EventRequest.findByPk(id);
    
    if (!eventRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Solicitud no encontrada' 
      });
    }
    
    if (!userRole || (userRole !== 'admin' && (!userId || userId !== eventRequest.managerId))) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para aprobar esta solicitud' 
      });
    }
    
    eventRequest.estado = 'aprobado';
    await eventRequest.save();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Solicitud aprobada exitosamente', 
      eventRequest 
    });
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al aprobar la solicitud',
      error: error.message
    });
  }
});

router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    let userId = null;
    let userRole = null;
    
    if (req.auth) {
      userId = req.auth.id;
      userRole = req.auth.role;
    } else if (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email'] === 'admin@eventsbga.com') {
      userRole = 'admin';
    }
    
    const { rejectionReason } = req.body;
    
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un motivo para el rechazo'
      });
    }
    
    const eventRequest = await EventRequest.findByPk(id);
    
    if (!eventRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Solicitud no encontrada' 
      });
    }
    
    if (!userRole || (userRole !== 'admin' && (!userId || userId !== eventRequest.managerId))) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para rechazar esta solicitud' 
      });
    }
    
    eventRequest.estado = 'rechazado';
    eventRequest.rejectionReason = rejectionReason;
    await eventRequest.save();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Solicitud rechazada exitosamente', 
      eventRequest 
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al rechazar la solicitud',
      error: error.message
    });
  }
});

router.get('/artist-info/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del usuario'
      });
    }
    
    const [artists] = await sequelize.query(
      `SELECT * FROM "Artists" WHERE "userId" = :userId`,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    console.log('Resultado de la consulta:', artists);
    
    if (!artists) {
      return res.status(404).json({
        success: false,
        message: 'Artista no encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      artist: artists
    });
    
  } catch (error) {
    console.error('Error al obtener información del artista:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener información del artista'
    });
  }
});

router.post('/artist-submit', eventRequestController.createEventRequestWithoutToken);
router.get('/artist-requests/:artistId', eventRequestController.getArtistRequestsWithoutToken);

router.get('/manager-requests/:managerId', async (req, res) => {
  try {
    const { managerId } = req.params;
    
    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del gestor'
      });
    }
    
    console.log(`Buscando solicitudes para el gestor: ${managerId}`);
    
    const headerUserId = req.headers['x-user-id'];
    if (headerUserId !== managerId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver estas solicitudes'
      });
    }
    
    const requests = await EventRequest.findAll({
      where: { managerId },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Encontradas ${requests.length} solicitudes para el gestor ${managerId}`);
    
    if (!requests || requests.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No se encontraron solicitudes para este gestor',
        requests: []
      });
    }
    
    const transformedRequests = requests.map(request => {
      let metadatos = {};
      try {
        if (request.metadatos) {
          metadatos = JSON.parse(request.metadatos);
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
        customCategory: request.categoriaPersonalizada || '',
        additionalRequirements: request.requerimientosAdicionales || '',
        status: request.estado || 'pendiente',
        artistId: request.artistId || '',
        managerId: request.managerId || '',
        spaceId: request.spaceId || '',
        rejectionReason: request.rejectionReason || '',
        createdAt: request.createdAt || new Date(),
        updatedAt: request.updatedAt || new Date(),
        spaceName: metadatos.spaceName || 'Espacio Cultural',
        spaceAddress: metadatos.spaceAddress || '',
        metadatos: request.metadatos || ''
      };
    });
    
    return res.status(200).json({
      success: true,
      message: `Se encontraron ${transformedRequests.length} solicitudes para el gestor ${managerId}`,
      requests: transformedRequests
    });
    
  } catch (error) {
    console.error('Error al obtener solicitudes del gestor sin token:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes del gestor',
      error: error.message
    });
  }
});

router.post('/block-slot', async (req, res) => {
  try {
    const { spaceId, day, hour, isRecurring, dayName, eventId } = req.body;
    
    console.log('Datos recibidos para bloquear slot:', { spaceId, day, hour, isRecurring, dayName, eventId });
    
  
    if (!spaceId || hour === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos: se requiere spaceId y hour' 
      });
    }
    
    let dayOfWeek = 0; 
    let dateValue = null;
    let dayNameValue = '';
    
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    try {
      if (day && typeof day === 'string' && day.includes('-')) {
        const [year, month, dayOfMonth] = day.split('-').map(num => parseInt(num, 10));
        
        const eventDate = new Date(year, month - 1, dayOfMonth);
        
        if (!isNaN(eventDate.getTime())) {
          dayOfWeek = eventDate.getDay();
          dateValue = day; 
          dayNameValue = dayNames[dayOfWeek]; 
          
          console.log(`Fecha ${day} (${year}-${month}-${dayOfMonth}) es un ${dayNameValue}, día de semana: ${dayOfWeek}`);
          
          const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          console.log(`Verificación: ${eventDate.toISOString().split('T')[0]} es un ${diasSemana[eventDate.getDay()]}`);
        }
      } else if (day !== undefined) {
        const numDay = parseInt(day, 10);
        if (!isNaN(numDay) && numDay >= 0 && numDay <= 6) {
          dayOfWeek = numDay;
          dayNameValue = dayNames[dayOfWeek];
        }
      }
    } catch (error) {
      console.error('Error al procesar la fecha/día:', error);
    }
    
    const BlockedSlot = require('../models/BlockedSlot');
    const { Manager } = require('../models/Manager');
    
    let managerId = spaceId;
    
    if (spaceId && !spaceId.includes('|') && spaceId.includes('-')) {
      try {
        const manager = await Manager.findByPk(spaceId);
        if (manager && manager.userId) {
          managerId = manager.userId; 
          console.log(`Usando ID de autenticación del gestor: ${managerId} en lugar de ID interno: ${spaceId}`);
        }
      } catch (error) {
        console.error('Error al buscar ID de autenticación del gestor:', error);
      }
    }
    
    const slotData = {
      managerId: managerId, 
      hour: hour,
      day: dayOfWeek, 
      isRecurring: isRecurring || false,
      dayName: dayNameValue || (isRecurring ? dayNames[dayOfWeek] : 'Día no especificado')
    };
    
    if (dateValue && !isRecurring) {
      slotData.date = dateValue;
    }
    
    console.log('Creando bloqueo con datos:', slotData);
    
    const blockedSlot = await BlockedSlot.create(slotData);
    
    console.log('Slot bloqueado exitosamente:', blockedSlot.id);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Slot bloqueado exitosamente',
      blockedSlot: {
        id: blockedSlot.id,
        managerId: blockedSlot.managerId,
        hour: blockedSlot.hour,
        day: blockedSlot.day,
        isRecurring: blockedSlot.isRecurring
      }
    });
  } catch (error) {
    console.error('Error al bloquear slot automáticamente:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al bloquear el slot',
      error: error.message
    });
  }
});

router.post('/approve-request/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const eventRequest = await EventRequest.findByPk(id);
    
    if (!eventRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de evento no encontrada'
      });
    }
    
    eventRequest.estado = 'aprobado';
    await eventRequest.save();
    
    console.log(`Solicitud ${id} aprobada correctamente`);
    
    return res.status(200).json({
      success: true,
      message: 'Solicitud de evento aprobada correctamente',
      eventRequest
    });
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al aprobar la solicitud',
      error: error.message
    });
  }
});

router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un motivo de rechazo'
      });
    }
    
  
    const eventRequest = await EventRequest.findByPk(id);
    
    if (!eventRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de evento no encontrada'
      });
    }
    
    eventRequest.estado = 'rechazado';
    eventRequest.rejectionReason = rejectionReason;
    await eventRequest.save();
    
    console.log(`Solicitud ${id} rechazada correctamente`);
    
    return res.status(200).json({
      success: true,
      message: 'Solicitud de evento rechazada correctamente',
      eventRequest
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al rechazar la solicitud',
      error: error.message
    });
  }
});

router.post('/reject-request/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, managerId, managerEmail } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un motivo de rechazo'
      });
    }
    
    const userId = req.headers['x-user-id'] || managerId;
    const userEmail = req.headers['x-user-email'] || managerEmail;
    
    console.log(`Intento de rechazo para solicitud ${id} por gestor ${userId} (${userEmail})`);
    
  
    const eventRequest = await EventRequest.findByPk(id);
    
    if (!eventRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de evento no encontrada'
      });
    }
    
    eventRequest.estado = 'rechazado';
    eventRequest.rejectionReason = rejectionReason;
    
    try {
      let metadatos = {};
      
      if (eventRequest.metadatos) {
        if (typeof eventRequest.metadatos === 'string') {
          metadatos = JSON.parse(eventRequest.metadatos);
        } else {
          metadatos = eventRequest.metadatos;
        }
      }
      
      metadatos.rejectionInfo = {
        rejectedAt: new Date().toISOString(),
        rejectedBy: userId || 'unknown',
        rejectedByEmail: userEmail || 'unknown'
      };
      
      eventRequest.metadatos = JSON.stringify(metadatos);
    } catch (metaError) {
      console.error('Error al actualizar metadatos:', metaError);
    }
    
    await eventRequest.save();
    
    console.log(`Solicitud ${id} rechazada correctamente sin autenticación`);
    
    return res.status(200).json({
      success: true,
      message: 'Solicitud de evento rechazada correctamente',
      eventRequest: {
        id: eventRequest.id,
        estado: eventRequest.estado,
        rejectionReason: eventRequest.rejectionReason
      }
    });
  } catch (error) {
    console.error('Error al rechazar solicitud sin autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al rechazar la solicitud',
      error: error.message
    });
  }
});

router.get('/approved', async (req, res) => {
  try {
    const eventRequests = await EventRequest.findAll({
      where: {
        estado: 'aprobado'
      },
      order: [['createdAt', 'DESC']]
    });
    
    const transformedRequests = eventRequests.map(request => {
      return {
        id: request.id,
        titulo: request.titulo || 'Sin título',
        descripcion: request.descripcion || '',
        fecha: request.fecha || new Date().toISOString().split('T')[0],
        horaInicio: request.horaInicio || '00:00:00',
        horaFin: request.horaFin || '00:00:00',
        asistentesEsperados: request.asistentesEsperados || 0,
        tipoEvento: request.tipoEvento || '',
        categoria: request.categoria || '',
        categoriaPersonalizada: request.categoriaPersonalizada || '',
        requerimientosAdicionales: request.requerimientosAdicionales || '',
        estado: request.estado || 'aprobado',
        artistId: request.artistId || '',
        managerId: request.managerId || '',
        spaceId: request.spaceId || '',
        createdAt: request.createdAt || new Date(),
        updatedAt: request.updatedAt || new Date()
      };
    });
    
    return res.status(200).json({
      success: true,
      eventRequests: transformedRequests
    });
  } catch (error) {
    console.error('Error al obtener solicitudes aprobadas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las solicitudes de eventos aprobadas',
      error: error.message
    });
  }
});

module.exports = router;
