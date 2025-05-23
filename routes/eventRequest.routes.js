const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const EventRequest = require('../models/EventRequest');
const User = require('../models/User');
const CulturalSpace = require('../models/CulturalSpace');
const { Op } = require('sequelize');
const eventRequestController = require('../controllers/eventRequestController');
const sequelize = require('../config/database'); // Corregir la importación de sequelize

// Obtener todas las solicitudes de eventos (filtradas según el rol del usuario)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Si no hay autenticación, verificar si es admin por headers
    let userId = null;
    let userRole = null;
    
    if (req.auth) {
      userId = req.auth.id;
      userRole = req.auth.role;
    } else if (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email'] === 'admin@eventsbga.com') {
      userRole = 'admin';
    }
    
    let query = {};
    
    // Si es artista, solo ver sus propias solicitudes
    if (userRole === 'artist' && userId) {
      query.artistId = userId;
    } 
    // Si es gestor, solo ver solicitudes para sus espacios
    else if (userRole === 'manager' && userId) {
      query.managerId = userId;
    }
    // Si no hay rol o ID válidos, devolver error
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

// Obtener solicitudes para un gestor específico
router.get('/manager/:managerId', authenticateToken, async (req, res) => {
  try {
    const { managerId } = req.params;
    
    // Si no hay autenticación, verificar si es admin por headers
    let userId = null;
    let userRole = null;
    
    if (req.auth) {
      userId = req.auth.id;
      userRole = req.auth.role;
    } else if (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email'] === 'admin@eventsbga.com') {
      userRole = 'admin';
    }
    
    // Verificar permisos (solo el propio gestor o un admin puede ver sus solicitudes)
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

// Obtener una solicitud específica por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Si no hay autenticación, verificar si es admin por headers
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
    
    // Verificar permisos (solo el artista que la creó o el gestor del espacio pueden verla)
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

// Crear una nueva solicitud de evento
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Si no hay autenticación, verificar si es admin por headers
    let userId = null;
    let userRole = null;
    
    if (req.auth) {
      userId = req.auth.id;
      userRole = req.auth.role;
    } else if (req.headers['x-user-role'] === 'admin' && req.headers['x-user-email'] === 'admin@eventsbga.com') {
      userRole = 'admin';
    } else if (req.headers['x-user-role'] === 'artist' && req.headers['x-user-id']) {
      // Permitir solicitudes con headers personalizados para solucionar problemas de autenticación
      userId = req.headers['x-user-id'];
      userRole = 'artist';
      console.log('Usando headers personalizados para autenticación:', { userId, userRole });
    }
    
    // Validar que el usuario esté autenticado y sea un artista o admin
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
    
    // Validar que el usuario tenga un ID válido si no es admin
    if (userRole !== 'admin' && !userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'No se puede identificar al usuario' 
      });
    }
    
    // Crear la solicitud
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

// Actualizar el estado de una solicitud (aprobar/rechazar)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Si no hay autenticación, verificar si es admin por headers
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
    
    // Verificar permisos (solo el gestor del espacio puede actualizar el estado)
    if (!userRole || (userRole !== 'admin' && (!userId || userId !== eventRequest.managerId))) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para actualizar esta solicitud' 
      });
    }
    
    // Actualizar el estado
    eventRequest.estado = estado;
    
    // Si se rechaza, guardar el motivo
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

// Eliminar una solicitud
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Si no hay autenticación, verificar si es admin por headers
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
    
    // Verificar permisos (solo el artista que la creó puede eliminarla si está pendiente)
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

// Aprobar una solicitud de evento
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Si no hay autenticación, verificar si es admin por headers
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
    
    // Verificar permisos (solo el gestor del espacio puede aprobar)
    if (!userRole || (userRole !== 'admin' && (!userId || userId !== eventRequest.managerId))) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para aprobar esta solicitud' 
      });
    }
    
    // Actualizar el estado
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

// Rechazar una solicitud de evento
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Si no hay autenticación, verificar si es admin por headers
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
    
    // Verificar permisos (solo el gestor del espacio puede rechazar)
    if (!userRole || (userRole !== 'admin' && (!userId || userId !== eventRequest.managerId))) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para rechazar esta solicitud' 
      });
    }
    
    // Actualizar el estado y el motivo de rechazo
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

// Obtener información de un artista por su userId (sin autenticación)
router.get('/artist-info/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del usuario'
      });
    }
    
    // Consulta SQL directa para obtener la información del artista
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

// Endpoints alternativos sin token (para clientes móviles)
router.post('/artist-submit', eventRequestController.createEventRequestWithoutToken);
router.get('/artist-requests/:artistId', eventRequestController.getArtistRequestsWithoutToken);

// Endpoint para obtener solicitudes de un gestor sin token
router.get('/manager-requests/:managerId', async (req, res) => {
  try {
    const { managerId } = req.params;
    
    // Verificar que se proporcionó un ID de gestor
    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del gestor'
      });
    }
    
    console.log(`Buscando solicitudes para el gestor: ${managerId}`);
    
    // Verificar que el ID del gestor coincida con el ID en los headers
    const headerUserId = req.headers['x-user-id'];
    if (headerUserId !== managerId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver estas solicitudes'
      });
    }
    
    // Buscar las solicitudes del gestor usando Sequelize (sin incluir modelos adicionales)
    const requests = await EventRequest.findAll({
      where: { managerId },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Encontradas ${requests.length} solicitudes para el gestor ${managerId}`);
    
    // Si no hay solicitudes, devolver un array vacío
    if (!requests || requests.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No se encontraron solicitudes para este gestor',
        requests: []
      });
    }
    
    // Transformar las solicitudes al formato esperado por el frontend
    const transformedRequests = requests.map(request => {
      // Intentar extraer metadatos si existen
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
        // Priorizar el nombre del espacio de los metadatos
        spaceName: metadatos.spaceName || 'Espacio Cultural',
        spaceAddress: metadatos.spaceAddress || '',
        // Incluir los metadatos originales para que el frontend pueda procesarlos si es necesario
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

// Bloquear un slot de horario cuando se aprueba una solicitud (sin requerir autenticación)
router.post('/block-slot', async (req, res) => {
  try {
    const { spaceId, day, hour, isRecurring, dayName, eventId } = req.body;
    
    console.log('Datos recibidos para bloquear slot:', { spaceId, day, hour, isRecurring, dayName, eventId });
    
    // Validar datos mínimos necesarios
    if (!spaceId || hour === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos: se requiere spaceId y hour' 
      });
    }
    
    // Procesar el día de la semana (0-6) si es una fecha
    let dayOfWeek = 0; // Valor predeterminado: domingo
    let dateValue = null;
    let dayNameValue = '';
    
    // Mapeo de días de la semana en español
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    try {
      if (day && typeof day === 'string' && day.includes('-')) {
        // Es una fecha en formato YYYY-MM-DD
        // Crear la fecha correctamente ajustando la zona horaria
        const [year, month, dayOfMonth] = day.split('-').map(num => parseInt(num, 10));
        
        // Crear la fecha con año, mes (0-11) y día
        const eventDate = new Date(year, month - 1, dayOfMonth);
        
        if (!isNaN(eventDate.getTime())) {
          // Obtener el día de la semana (0-6)
          dayOfWeek = eventDate.getDay();
          dateValue = day; // Guardar la fecha en formato YYYY-MM-DD
          dayNameValue = dayNames[dayOfWeek]; // Nombre del día en español
          
          console.log(`Fecha ${day} (${year}-${month}-${dayOfMonth}) es un ${dayNameValue}, día de semana: ${dayOfWeek}`);
          
          // Verificación adicional para asegurarnos de que el cálculo es correcto
          const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          console.log(`Verificación: ${eventDate.toISOString().split('T')[0]} es un ${diasSemana[eventDate.getDay()]}`);
        }
      } else if (day !== undefined) {
        // Intentar convertir a número
        const numDay = parseInt(day, 10);
        if (!isNaN(numDay) && numDay >= 0 && numDay <= 6) {
          dayOfWeek = numDay;
          dayNameValue = dayNames[dayOfWeek];
        }
      }
    } catch (error) {
      console.error('Error al procesar la fecha/día:', error);
      // Continuar con el valor predeterminado
    }
    
    // Crear el registro de bloqueo usando el modelo directamente
    const BlockedSlot = require('../models/BlockedSlot');
    const { Manager } = require('../models/Manager');
    
    // Verificar si el spaceId es un ID de autenticación (idauth) o un ID interno
    // Si es un ID de autenticación, lo usamos directamente para mantener consistencia con registros existentes
    let managerId = spaceId;
    
    // Si el ID no parece ser un ID de autenticación (no contiene | o tiene formato UUID), intentar buscar el ID de autenticación
    if (spaceId && !spaceId.includes('|') && spaceId.includes('-')) {
      try {
        // Buscar el manager por su ID interno para obtener su ID de autenticación
        const manager = await Manager.findByPk(spaceId);
        if (manager && manager.userId) {
          managerId = manager.userId; // Usar el ID de autenticación (idauth)
          console.log(`Usando ID de autenticación del gestor: ${managerId} en lugar de ID interno: ${spaceId}`);
        }
      } catch (error) {
        console.error('Error al buscar ID de autenticación del gestor:', error);
        // Continuar con el ID original
      }
    }
    
    // Crear un objeto con solo los campos necesarios
    const slotData = {
      managerId: managerId, // Usar el ID de autenticación (idauth) para mantener consistencia
      hour: hour,
      day: dayOfWeek, // Día de la semana (0-6) calculado a partir de la fecha
      isRecurring: isRecurring || false,
      // Usar siempre el nombre del día de la semana correspondiente a la fecha
      dayName: dayNameValue || (isRecurring ? dayNames[dayOfWeek] : 'Día no especificado')
    };
    
    // Añadir la fecha solo si está disponible y no es recurrente
    if (dateValue && !isRecurring) {
      slotData.date = dateValue;
    }
    
    console.log('Creando bloqueo con datos:', slotData);
    
    // Crear el registro
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

// Aprobar una solicitud de evento (sin autenticación)
router.post('/approve-request/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar la solicitud
    const eventRequest = await EventRequest.findByPk(id);
    
    if (!eventRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de evento no encontrada'
      });
    }
    
    // Actualizar el estado a aprobado
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

// Rechazar una solicitud de evento (con autenticación)
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    // Verificar que haya un motivo de rechazo
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un motivo de rechazo'
      });
    }
    
    // Buscar la solicitud
    const eventRequest = await EventRequest.findByPk(id);
    
    if (!eventRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de evento no encontrada'
      });
    }
    
    // Actualizar el estado a rechazado
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

// Rechazar una solicitud de evento (sin autenticación)
router.post('/reject-request/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, managerId, managerEmail } = req.body;
    
    // Verificar que haya un motivo de rechazo
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un motivo de rechazo'
      });
    }
    
    // Obtener información del gestor desde los headers si están disponibles
    const userId = req.headers['x-user-id'] || managerId;
    const userEmail = req.headers['x-user-email'] || managerEmail;
    
    console.log(`Intento de rechazo para solicitud ${id} por gestor ${userId} (${userEmail})`);
    
    // Buscar la solicitud
    const eventRequest = await EventRequest.findByPk(id);
    
    if (!eventRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de evento no encontrada'
      });
    }
    
    // Actualizar el estado a rechazado
    eventRequest.estado = 'rechazado';
    eventRequest.rejectionReason = rejectionReason;
    
    // Guardar información adicional en los metadatos
    try {
      let metadatos = {};
      
      // Intentar parsear los metadatos existentes si los hay
      if (eventRequest.metadatos) {
        if (typeof eventRequest.metadatos === 'string') {
          metadatos = JSON.parse(eventRequest.metadatos);
        } else {
          metadatos = eventRequest.metadatos;
        }
      }
      
      // Añadir información sobre el rechazo
      metadatos.rejectionInfo = {
        rejectedAt: new Date().toISOString(),
        rejectedBy: userId || 'unknown',
        rejectedByEmail: userEmail || 'unknown'
      };
      
      // Guardar los metadatos actualizados
      eventRequest.metadatos = JSON.stringify(metadatos);
    } catch (metaError) {
      console.error('Error al actualizar metadatos:', metaError);
      // Continuar con el proceso aunque haya error en los metadatos
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

// Obtener solicitudes de eventos aprobadas
router.get('/approved', async (req, res) => {
  try {
    // Buscar todas las solicitudes con estado 'aprobado'
    const eventRequests = await EventRequest.findAll({
      where: {
        estado: 'aprobado'
      },
      // No incluir asociaciones para evitar el error
      order: [['createdAt', 'DESC']]
    });
    
    // Transformar los datos para que sean compatibles con el frontend
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
