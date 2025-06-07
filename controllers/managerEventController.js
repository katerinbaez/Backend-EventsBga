// Controlador de eventos de gestores
// Maneja la creación y gestión de eventos directos por gestores culturales

const Event = require('../models/Event');
const CulturalSpace = require('../models/CulturalSpace');
const { User } = require('../models/User');
const EventAttendance = require('../models/EventAttendance');

exports.createManagerEvent = async (req, res) => {
  try {
    console.log('Recibida solicitud para crear evento como gestor:', req.body);
    
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
    
    if (!titulo || !descripcion || !fecha || !horaInicio || !horaFin || !managerId) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para crear el evento'
      });
    }
    
    let espacioCultural;
    try {
      espacioCultural = await CulturalSpace.findOne({
        where: { managerId }
      });
      
      if (!espacioCultural) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró espacio cultural asociado a este gestor'
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
    
    const realSpaceId = espacioCultural.id;
    
    const nuevoEvento = await Event.create({
      titulo,
      descripcion,
      fechaProgramada: new Date(`${fecha}T${horaInicio}`),
      spaceId: realSpaceId,
      managerId,
      categoria,
      tipoEvento,
      asistentesEsperados: asistentesEsperados || 0,
      requerimientosAdicionales: requerimientosAdicionales || 'Ninguno',
      estado: 'programado' 
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

exports.getManagerEvents = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del gestor'
      });
    }
    
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

exports.deleteManagerEvent = async (req, res) => {
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
    else if (req.user && req.user.id && req.user.role) {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      if (userRole !== 'admin' && userRole !== 'manager') {
        if (event.managerId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para eliminar este evento'
          });
        }
      }
    }
    else {
      console.log('Omitiendo verificación de permisos por falta de datos de usuario');
    }
    
    try {
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
    console.error('Error al eliminar evento de gestor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el evento',
      error: error.message
    });
  }
};

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
    
    const evento = await Event.findByPk(id);
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    if (managerId && evento.managerId !== managerId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este evento'
      });
    }
    
    const datosActualizados = {};
    
    if (titulo) datosActualizados.titulo = titulo;
    if (descripcion) datosActualizados.descripcion = descripcion;
    
    if (fecha && horaInicio) {
      datosActualizados.fechaProgramada = new Date(`${fecha}T${horaInicio}`);
    }
    
    if (categoria) datosActualizados.categoria = categoria;
    if (tipoEvento) datosActualizados.tipoEvento = tipoEvento;
    if (asistentesEsperados) datosActualizados.asistentesEsperados = asistentesEsperados;
    if (requerimientosAdicionales) datosActualizados.requerimientosAdicionales = requerimientosAdicionales;
    
    await evento.update(datosActualizados);
    
    return res.status(200).json({
      success: true,
      message: 'Evento actualizado exitosamente',
      event: await Event.findByPk(id)
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
