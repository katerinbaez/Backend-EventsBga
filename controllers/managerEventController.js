// Controlador para eventos creados por gestores
const Event = require('../models/Event');
const CulturalSpace = require('../models/CulturalSpace');
const { User } = require('../models/User');
const EventAttendance = require('../models/EventAttendance');

// Crear un evento directamente como gestor cultural
exports.createManagerEvent = async (req, res) => {
  try {
    console.log('Recibida solicitud para crear evento como gestor:', req.body);
    
    // Extraer datos del cuerpo de la solicitud
    const { 
      titulo, 
      descripcion, 
      fecha, 
      horaInicio, 
      horaFin, 
      spaceId, 
      managerId,
      categoria,
      tipoEvento,
      asistentesEsperados,
      requerimientosAdicionales
    } = req.body;
    
    // Validar campos obligatorios
    if (!titulo || !descripcion || !fecha || !horaInicio || !horaFin || !managerId) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para crear el evento'
      });
    }
    
    // Buscar un espacio cultural existente (usar el primero disponible)
    let space;
    try {
      space = await CulturalSpace.findOne();
      if (!space) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró ningún espacio cultural'
        });
      }
    } catch (error) {
      console.error('Error al buscar espacio cultural:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al buscar espacio cultural',
        error: error.message
      });
    }
    
    // Usar el ID del espacio encontrado
    const realSpaceId = space.id;
    
    // Crear el evento
    const nuevoEvento = await Event.create({
      titulo,
      descripcion,
      fechaProgramada: new Date(`${fecha}T${horaInicio}`), // Usar la fecha y hora de inicio como fecha programada
      spaceId: realSpaceId,
      managerId,
      categoria,
      tipoEvento,
      asistentesEsperados: asistentesEsperados || 0,
      requerimientosAdicionales: requerimientosAdicionales || 'Ninguno',
      estado: 'programado' // Eventos creados por gestores están programados automáticamente
    });
    
    return res.status(201).json({
      success: true,
      message: 'Evento creado exitosamente',
      event: nuevoEvento
    });
    
  } catch (error) {
    console.error('Error al crear evento como gestor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el evento',
      error: error.message
    });
  }
};

// Obtener todos los eventos creados por un gestor
exports.getManagerEvents = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del gestor'
      });
    }
    
    // Buscar todos los eventos creados por este gestor
    const events = await Event.findAll({
      where: { managerId },
      order: [['fechaProgramada', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error al obtener eventos del gestor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener eventos del gestor',
      error: error.message
    });
  }
};

// Eliminar un evento creado por un gestor
exports.deleteManagerEvent = async (req, res) => {
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
    
    // Verificar si se está usando el modo admin mediante query param o headers especiales
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
    else if (req.user && req.user.id && req.user.role) {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Verificar permisos (solo el gestor que creó el evento o un admin puede eliminarlo)
      if (userRole !== 'admin' && userRole !== 'manager') {
        if (event.managerId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para eliminar este evento'
          });
        }
      }
    }
    // Si no es modo admin/manager y req.user no existe o es incompleto, omitir verificación
    else {
      console.log('Omitiendo verificación de permisos por falta de datos de usuario');
    }
    
    try {
      // Primero eliminar los registros asociados en EventAttendances
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
    console.error('Error al eliminar evento de gestor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el evento',
      error: error.message
    });
  }
};

// Actualizar un evento creado por un gestor
exports.updateManagerEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      titulo, 
      descripcion, 
      fecha, 
      horaInicio, 
      horaFin, 
      categoria,
      tipoEvento,
      asistentesEsperados,
      requerimientosAdicionales,
      managerId
    } = req.body;
    
    console.log('Recibida solicitud para actualizar evento:', id);
    console.log('Datos recibidos:', req.body);
    
    // Validar que el evento exista
    const evento = await Event.findByPk(id);
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // Validar que el evento pertenezca al gestor (si se proporciona managerId)
    if (managerId && evento.managerId !== managerId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este evento'
      });
    }
    
    // Preparar los datos para actualizar
    const datosActualizados = {};
    
    // Actualizar solo los campos proporcionados
    if (titulo) datosActualizados.titulo = titulo;
    if (descripcion) datosActualizados.descripcion = descripcion;
    
    // Si se proporciona fecha y hora, actualizar fechaProgramada
    if (fecha && horaInicio) {
      datosActualizados.fechaProgramada = new Date(`${fecha}T${horaInicio}`);
    }
    
    // Actualizar otros campos si se proporcionan
    if (categoria) datosActualizados.categoria = categoria;
    if (tipoEvento) datosActualizados.tipoEvento = tipoEvento;
    if (asistentesEsperados) datosActualizados.asistentesEsperados = asistentesEsperados;
    if (requerimientosAdicionales) datosActualizados.requerimientosAdicionales = requerimientosAdicionales;
    
    // Actualizar el evento
    await evento.update(datosActualizados);
    
    return res.status(200).json({
      success: true,
      message: 'Evento actualizado exitosamente',
      event: await Event.findByPk(id) // Devolver el evento actualizado
    });
    
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el evento',
      error: error.message
    });
  }
};
