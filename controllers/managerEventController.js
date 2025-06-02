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
    
    // Validar campos obligatorios y registrar los datos recibidos para depuración
    console.log('Datos recibidos para crear evento:', {
      titulo, descripcion, fecha, horaInicio, horaFin, managerId, spaceId
    });
    
    if (!titulo || !descripcion || !fecha || !horaInicio || !horaFin || !managerId) {
      console.log('Faltan campos obligatorios para crear el evento');
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para crear el evento'
      });
    }
    
    // Verificar y obtener el espacio cultural correcto
    let espacioCultural;
    
    // Primero, buscar siempre el espacio cultural asociado al managerId
    console.log(`Buscando espacios culturales para el manager: ${managerId}`);
    
    // Usar el modelo CulturalSpace para acceder a la tabla CulturalSpaces
    espacioCultural = await CulturalSpace.findOne({
      where: {
        managerId: managerId
      }
    });
    console.log('Resultado de la búsqueda por managerId:', espacioCultural ? 'Encontrado' : 'No encontrado');
    
    // Si no se encontró un espacio asociado al manager, intentar buscar por spaceId si se proporcionó
    if (!espacioCultural && spaceId) {
      console.log(`No se encontró espacio para el manager: ${managerId}, intentando buscar por spaceId: ${spaceId}`);
      
      try {
        // Intentar convertir a número si es posible (los IDs de espacios son enteros)
        const spaceIdNum = parseInt(spaceId, 10);
        
        if (!isNaN(spaceIdNum)) {
          espacioCultural = await CulturalSpace.findByPk(spaceIdNum);
          console.log(`Buscando espacio por ID numérico: ${spaceIdNum}`);
        } else {
          console.log(`El spaceId no es un número válido: ${spaceId}`);
        }
      } catch (error) {
        console.error('Error al convertir o buscar spaceId:', error);
      }
    }
    
    // Si todavía no se encontró un espacio, buscar cualquier espacio disponible
    if (!espacioCultural) {
      console.log('No se encontró un espacio específico, buscando cualquier espacio disponible...');
      espacioCultural = await CulturalSpace.findOne();
    }
    
    // Si no se encontró ningún espacio cultural, retornar error
    if (!espacioCultural) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró ningún espacio cultural disponible'
      });
    }
    
    console.log(`Se usará el espacio cultural: ${espacioCultural.nombre} (ID: ${espacioCultural.id})`);
    
    
    // Validar que la fecha no sea en el pasado
    const fechaEvento = new Date(`${fecha}T${horaInicio}`);
    const ahora = new Date();
    
    if (fechaEvento < ahora) {
      return res.status(400).json({
        success: false,
        message: 'No se pueden crear eventos con fechas pasadas'
      });
    }
    
    // Verificar si ya existe un evento con los mismos datos para evitar duplicados
    console.log('Verificando si ya existe un evento similar...');
    try {
      const eventoExistente = await Event.findOne({
        where: {
          titulo,
          fechaProgramada: fechaEvento,
          managerId
        }
      });
      
      if (eventoExistente) {
        console.log('Ya existe un evento con estos datos:', eventoExistente.id);
        return res.status(409).json({
          success: false,
          message: 'Ya existe un evento con el mismo título y fecha para este gestor',
          eventId: eventoExistente.id
        });
      }
      console.log('No se encontró un evento existente con los mismos datos');
    } catch (error) {
      console.error('Error al verificar eventos existentes:', error);
    }
    
    // Crear el evento con el espacio cultural correcto
    console.log('Creando nuevo evento con spaceId:', espacioCultural.id);
    let nuevoEvento;
    try {
      nuevoEvento = await Event.create({
        titulo,
        descripcion,
        fechaProgramada: fechaEvento,
        spaceId: espacioCultural.id, // <-- Usamos el ID del espacio encontrado
        managerId,
        categoria,
        tipoEvento,
        asistentesEsperados: asistentesEsperados || 0,
        requerimientosAdicionales: requerimientosAdicionales || 'Ninguno',
        estado: 'programado'
      });
      console.log('Evento creado exitosamente con ID:', nuevoEvento.id);
    } catch (error) {
      console.error('Error específico al crear el evento:', error.message);
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log('Violación de restricción de unicidad:', error.fields);
      } else if (error.name === 'SequelizeForeignKeyConstraintError') {
        console.log('Violación de clave foránea:', error.fields);
      } else if (error.name === 'SequelizeValidationError') {
        console.log('Error de validación:', error.errors.map(e => e.message));
      }
      throw error; // Re-lanzar el error para que sea manejado por el bloque catch exterior
    }
    
    return res.status(201).json({
      success: true,
      message: 'Evento creado exitosamente',
      event: nuevoEvento
    });
    
  } catch (error) {
    console.error('Error al crear evento como gestor:', error);
    
    // Proporcionar mensajes de error más específicos según el tipo de error
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos para crear el evento',
        details: error.errors.map(e => e.message)
      });
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'El espacio cultural o gestor especificado no existe'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Error al crear el evento',
        error: error.message
      });
    }
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
