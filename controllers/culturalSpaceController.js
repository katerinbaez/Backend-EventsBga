const CulturalSpace = require('../models/CulturalSpace');
const { User } = require('../models/User');
const SpaceAvailability = require('../models/SpaceAvailability');
const BlockedSlot = require('../models/BlockedSlot');
const { Manager } = require('../models/Manager');
const { Op } = require('sequelize');

// Obtener todos los espacios culturales
exports.getAllSpaces = async (req, res) => {
  try {
    const spaces = await CulturalSpace.findAll();
    
    res.json({
      success: true,
      spaces
    });
  } catch (error) {
    console.error('Error al obtener espacios culturales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener espacios culturales',
      error: error.message
    });
  }
};

// Obtener un espacio cultural por ID
exports.getSpaceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const space = await CulturalSpace.findByPk(id);
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Espacio cultural no encontrado'
      });
    }
    
    res.json({
      success: true,
      space
    });
  } catch (error) {
    console.error('Error al obtener espacio cultural:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el espacio cultural',
      error: error.message
    });
  }
};

// Crear un nuevo espacio cultural
exports.createSpace = async (req, res) => {
  try {
    // Intentar obtener el managerId de los parámetros de la URL o del cuerpo de la solicitud
    let managerId = req.params.managerId;
    
    // Si no está en los parámetros, intentar obtenerlo del cuerpo
    if (!managerId && req.body && req.body.managerId) {
      managerId = req.body.managerId;
    }
    
    // Decodificar el ID si viene codificado
    const decodedManagerId = managerId ? decodeURIComponent(managerId) : null;
    
    // Extraer datos del cuerpo de la solicitud
    const { 
      nombre, 
      direccion, 
      contacto, 
      capacidad, 
      descripcion, 
      instalaciones, 
      disponibilidad, 
      images, 
      redesSociales,
      latitude,
      longitude
    } = req.body;
    
    // Validar coordenadas si se proporcionan
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({
        success: false,
        message: 'La latitud debe estar entre -90 y 90 grados'
      });
    }
    
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({
        success: false,
        message: 'La longitud debe estar entre -180 y 180 grados'
      });
    }
    
    // Crear el espacio cultural con todos los campos
    const space = await CulturalSpace.create({ 
      managerId: decodedManagerId,
      nombre,
      direccion,
      contacto,
      capacidad,
      descripcion,
      instalaciones,
      disponibilidad,
      images,
      redesSociales,
      latitude: latitude || 0,
      longitude: longitude || 0
    });
    
    res.json({
      success: true,
      message: 'Espacio cultural creado exitosamente',
      space
    });
  } catch (error) {
    console.error('Error al crear espacio cultural:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el espacio cultural',
      error: error.message
    });
  }
};

// Obtener disponibilidad de un espacio cultural
exports.getSpaceAvailability = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { date } = req.query;
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`Obteniendo disponibilidad para manager: ${decodedManagerId}${date ? `, fecha: ${date}` : ', fecha: No especificada'}`);
    
    // Si se especifica una fecha, buscar configuración para esa fecha
    let isSpecificDate = false;
    
    // Buscar disponibilidad
    let availability = [];
    
    if (date) {
      // Buscar por fecha específica
      isSpecificDate = true;
      console.log(`Buscando disponibilidad específica para fecha: ${date}`);
      
      // Buscar con userId usando la columna date en lugar de dateStr
      const specificAvailability = await SpaceAvailability.findAll({
        where: {
          managerId: decodedManagerId,
          date: {
            [Op.eq]: date
          }
        },
        order: [['dayOfWeek', 'ASC']]
      });
      
      console.log(`Encontrados ${specificAvailability.length} registros específicos con userId`);
      
      if (specificAvailability && specificAvailability.length > 0) {
        availability = specificAvailability;
      } else {
        // Buscar el manager para obtener su ID interno
        const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
        
        if (manager) {
          console.log(`Manager encontrado, buscando con ID: ${manager.id}`);
          
          // Buscar con el ID del manager
          const specificAvailabilityByManagerId = await SpaceAvailability.findAll({
            where: {
              managerId: manager.id,
              date: {
                [Op.eq]: date
              }
            },
            order: [['dayOfWeek', 'ASC']]
          });
          
          console.log(`Encontrados ${specificAvailabilityByManagerId.length} registros específicos con ID del manager`);
          
          if (specificAvailabilityByManagerId && specificAvailabilityByManagerId.length > 0) {
            availability = specificAvailabilityByManagerId;
          } else {
            isSpecificDate = false; // No se encontró configuración específica
          }
        }
      }
      
      // Si no se encontró disponibilidad específica, buscar configuración general
      if (availability.length === 0) {
        console.log(`No se encontró disponibilidad para la fecha ${date}, buscando configuración general`);
        isSpecificDate = false;
      }
    }
    
    // Si no hay fecha específica o no se encontró configuración específica, buscar configuración general
    if (!isSpecificDate) {
      console.log('Buscando disponibilidad general (sin fecha específica)');
      
      try {
        // Buscar con userId usando el campo date
        const generalAvailability = await SpaceAvailability.findAll({
          where: { 
            managerId: decodedManagerId,
            date: null
          },
          order: [['dayOfWeek', 'ASC']]
        });
        
        console.log(`Encontrados ${generalAvailability.length} registros generales con userId`);
        
        if (generalAvailability && generalAvailability.length > 0) {
          availability = generalAvailability;
        } else {
          // Buscar el manager para obtener su ID interno
          const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
          
          if (manager) {
            console.log(`Manager encontrado, buscando con ID: ${manager.id}`);
            
            // Buscar con el ID del manager - solo por dateStr, evitando usar el campo date
            const generalAvailabilityByManagerId = await SpaceAvailability.findAll({
              where: { 
                managerId: manager.id,
                [Op.or]: [
                  { dateStr: null },
                  { dateStr: '' }
                ]
              },
              order: [['dayOfWeek', 'ASC']]
            });
            
            console.log(`Encontrados ${generalAvailabilityByManagerId.length} registros generales con ID del manager`);
            
            if (generalAvailabilityByManagerId && generalAvailabilityByManagerId.length > 0) {
              availability = generalAvailabilityByManagerId;
            }
          }
        }
      } catch (err) {
        console.error('Error al buscar disponibilidad general:', err);
        // Continuar con el flujo normal incluso si hay error
      }
    }
    
    // Si no hay configuración, retornar objeto vacío
    if (!availability || availability.length === 0) {
      console.log('No se encontró ninguna configuración de disponibilidad');
      return res.json({
        success: true,
        availability: {},
        date: date || null,
        isSpecificDate: isSpecificDate,
        canCreateConfig: date ? true : false,
        message: 'No hay configuración de disponibilidad'
      });
    }
    
    // Formatear la disponibilidad para facilitar su uso en el frontend
    const formattedAvailability = {};
    availability.forEach(item => {
      // Como estamos usando getters/setters en el modelo, esto ya es un array
      formattedAvailability[item.dayOfWeek] = item.hourSlots;
      console.log(`Día ${item.dayOfWeek}: ${item.hourSlots.length} horas disponibles, fecha: ${item.dateStr || 'general'}, managerId: ${item.managerId}`);
    });
    
    console.log(`Se encontraron ${availability.length} configuraciones de disponibilidad`);
    console.log(`Enviando respuesta con isSpecificDate: ${isSpecificDate}, date: ${date || 'null'}`);
    
    res.json({
      success: true,
      availability: formattedAvailability,
      date: date || null,
      isSpecificDate: isSpecificDate,
      canCreateConfig: date && !isSpecificDate ? true : false
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad del espacio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener disponibilidad del espacio',
      error: error.message
    });
  }
};

// Actualizar disponibilidad de un espacio cultural
exports.updateSpaceAvailability = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { availability, date } = req.body;
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`Actualizando disponibilidad para manager: ${decodedManagerId}, fecha: ${date || 'No especificada'}`);
    
    // Validar datos recibidos
    if (!availability || typeof availability !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos para actualizar disponibilidad'
      });
    }
    
    // Si se proporciona una fecha específica, SOLO eliminar las configuraciones para esa fecha
    // NUNCA modificar la configuración general cuando se actualiza una fecha específica
    if (date) {
      console.log(`Eliminando configuraciones existentes SOLO para la fecha específica: ${date}`);
      await SpaceAvailability.destroy({
        where: { 
          managerId: decodedManagerId,
          date: date  // Usar 'date' en lugar de 'dateStr'
        }
      });
    } else {
      // Si estamos actualizando la configuración general, SOLO eliminar configuraciones generales
      // NUNCA modificar configuraciones específicas por fecha cuando se actualiza la general
      console.log('Eliminando configuraciones generales existentes (sin fecha específica)');
      await SpaceAvailability.destroy({
        where: { 
          managerId: decodedManagerId,
          date: null  // Solo eliminar registros donde date es NULL
        }
      });
    }
    
    // Crear nuevos registros por cada día con su configuración
    const createdRecords = [];
    
    for (const day in availability) {
      if (availability.hasOwnProperty(day)) {
        const hours = availability[day];
        
        if (Array.isArray(hours)) {
          // Preparar datos para crear el registro
          const recordData = {
            managerId: decodedManagerId,
            dayOfWeek: parseInt(day),
            hourSlots: hours // Este es el getter/setter definido en el modelo
          };
          
          // Si hay fecha específica, agregarla al registro
          if (date) {
            // Asegurarnos de que la fecha se guarde exactamente como viene, sin ajustes de zona horaria
            // Ya no usamos dateStr, solo date
            
            // Para el campo date, crear un objeto Date pero mantener la fecha exacta
            // Formato esperado: YYYY-MM-DD
            const [year, month, day] = date.split('-').map(num => parseInt(num, 10));
            
            // Crear fecha con la zona horaria local para evitar el desplazamiento de un día
            // Nota: NO usar new Date(Date.UTC(...)) ya que eso causa el problema de desplazamiento
            const dateObj = new Date(year, month - 1, day);
            
            // Forzar la fecha para que sea exactamente la especificada
            dateObj.setHours(12, 0, 0, 0); // Establecer al mediodía para evitar problemas de zona horaria
            
            recordData.date = dateObj;
            
            console.log(`Fecha específica configurada: ${date}, objeto Date: ${dateObj.toISOString()}`);
          }
          
          console.log(`Creando registro de disponibilidad para día ${day}, fecha: ${date || 'No especificada'}, con ${hours.length} horas`);
          
          const record = await SpaceAvailability.create(recordData);
          createdRecords.push(record);
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Disponibilidad actualizada correctamente',
      availability: availability,
      date: date || null
    });
  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la disponibilidad',
      error: error.message
    });
  }
};

// Obtener slots bloqueados de un espacio cultural
exports.getBlockedSlots = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`Buscando slots bloqueados para manager: ${decodedManagerId}`);
    
    // Buscar los slots bloqueados directamente por managerId
    const blockedSlots = await BlockedSlot.findAll({
      where: { 
        managerId: decodedManagerId
      }
    });
    
    console.log(`Encontrados ${blockedSlots.length} slots bloqueados`);
    
    // Formatear los resultados para el frontend
    const formattedSlots = blockedSlots.map(slot => {
      // Determinar qué campo de fecha usar (dateStr o date)
      const dateValue = slot.dateStr || slot.date;
      
      // Calcular el día de la semana a partir de la fecha
      let dayOfWeek = 0;
      try {
        if (dateValue) {
          const dateObj = new Date(dateValue);
          dayOfWeek = dateObj.getDay(); // 0: domingo, 1: lunes, etc.
        }
      } catch (error) {
        console.warn(`Error al procesar fecha para slot ${slot.id}:`, error.message);
      }
      
      return {
        id: slot.id,
        day: dayOfWeek,
        hour: typeof slot.hour === 'string' ? parseInt(slot.hour) : slot.hour,
        date: dateValue,
        dateStr: dateValue,
        isRecurring: Boolean(slot.isRecurring)
      };
    });
    
    res.json({
      success: true,
      blockedSlots: formattedSlots
    });
  } catch (error) {
    console.error('Error al obtener slots bloqueados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los slots bloqueados',
      error: error.message
    });
  }
};

// Bloquear slot en un espacio cultural
exports.blockSlot = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { date, hour, dateStr, isRecurring = false } = req.body;
    
    // Validar datos recibidos
    if ((!date && !dateStr) || hour === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos para bloquear slot: se requiere fecha y hora'
      });
    }
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    
    // Usar la fecha que esté disponible
    const finalDate = dateStr || date;
    
    // Calcular el día de la semana a partir de la fecha
    const dateObj = new Date(finalDate);
    const dayOfWeek = dateObj.getDay(); // 0: domingo, 1: lunes, etc.
    
    // Preparar datos para la creación y búsqueda
    const slotData = {
      managerId: decodedManagerId,
      hour: parseInt(hour),
      isRecurring: Boolean(isRecurring)
    };
    
    // Usar ambos campos de fecha para mayor compatibilidad
    if (dateStr) {
      slotData.dateStr = dateStr;
    }
    if (date) {
      slotData.date = date;
      // Si solo tenemos date, usarlo también como dateStr
      if (!dateStr) {
        slotData.dateStr = date;
      }
    }
    
    console.log('Intentando bloquear slot con datos:', slotData);
    
    // Preparar condiciones de búsqueda para verificar si ya existe
    const whereCondition = {
      managerId: decodedManagerId,
      hour: parseInt(hour)
    };
    
    if (dateStr) {
      whereCondition.dateStr = dateStr;
    } else if (date) {
      whereCondition.dateStr = date;
    }
    
    // Verificar si ya existe un slot bloqueado con estos datos
    const existingSlot = await BlockedSlot.findOne({
      where: whereCondition
    });
    
    if (existingSlot) {
      return res.json({
        success: true,
        message: 'Esta franja ya estaba bloqueada',
        blockedSlot: {
          id: existingSlot.id,
          day: dayOfWeek,
          hour: existingSlot.hour,
          date: existingSlot.dateStr || existingSlot.date,
          dateStr: existingSlot.dateStr || existingSlot.date,
          isRecurring: existingSlot.isRecurring
        }
      });
    }
    
    // Crear nuevo slot bloqueado
    const blockedSlot = await BlockedSlot.create(slotData);
    
    res.status(201).json({
      success: true,
      message: 'Franja bloqueada correctamente',
      blockedSlot: {
        id: blockedSlot.id,
        day: dayOfWeek,
        hour: blockedSlot.hour,
        date: blockedSlot.dateStr || blockedSlot.date,
        dateStr: blockedSlot.dateStr || blockedSlot.date,
        isRecurring: blockedSlot.isRecurring
      }
    });
  } catch (error) {
    console.error('Error al bloquear slot:', error);
    res.status(500).json({
      success: false,
      message: 'Error al bloquear la franja horaria',
      error: error.message
    });
  }
};

// Desbloquear slot en un espacio cultural
exports.unblockSlot = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { date, hour, dateStr } = req.body;
    
    // Validar datos recibidos
    if ((!date && !dateStr) || hour === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos para desbloquear slot: se requiere fecha y hora'
      });
    }
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    
    // Preparar condiciones de búsqueda para mayor compatibilidad
    const whereCondition = {
      managerId: decodedManagerId,
      hour: parseInt(hour)
    };
    
    // Usar ambos campos de fecha para mayor compatibilidad
    if (dateStr) {
      whereCondition.dateStr = dateStr;
    }
    if (date) {
      whereCondition.date = date;
      // Si solo tenemos date, usarlo también como dateStr
      if (!dateStr) {
        whereCondition.dateStr = date;
      }
    }
    
    console.log('Intentando desbloquear slot con condiciones:', whereCondition);
    
    // Buscar y eliminar el slot bloqueado
    const deletedCount = await BlockedSlot.destroy({
      where: whereCondition
    });
    
    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró la franja bloqueada'
      });
    }
    
    res.json({
      success: true,
      message: 'Franja desbloqueada correctamente'
    });
  } catch (error) {
    console.error('Error al desbloquear slot:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desbloquear la franja horaria',
      error: error.message
    });
  }
};

// Obtener espacio cultural por ID de manager
exports.getSpaceByManagerId = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    
    // Buscar el espacio cultural por ID de manager
    const space = await CulturalSpace.findOne({
      where: { managerId: decodedManagerId }
    });
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Espacio cultural no encontrado'
      });
    }
    
    res.json({
      success: true,
      space
    });
  } catch (error) {
    console.error('Error al obtener espacio cultural por ID de manager:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el espacio cultural',
      error: error.message
    });
  }
};

// Actualizar un espacio cultural
exports.updateSpace = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      managerId, 
      nombre, 
      direccion, 
      contacto, 
      capacidad, 
      descripcion, 
      instalaciones, 
      disponibilidad, 
      images, 
      redesSociales,
      latitude,
      longitude
    } = req.body;
    
    // Validar coordenadas si se proporcionan
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({
        success: false,
        message: 'La latitud debe estar entre -90 y 90 grados'
      });
    }
    
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({
        success: false,
        message: 'La longitud debe estar entre -180 y 180 grados'
      });
    }
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = managerId ? decodeURIComponent(managerId) : null;
    
    const space = await CulturalSpace.findByPk(id);
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Espacio cultural no encontrado'
      });
    }
    
    // Actualizar solo los campos proporcionados
    const updateData = {};
    if (decodedManagerId) updateData.managerId = decodedManagerId;
    if (nombre !== undefined) updateData.nombre = nombre;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (contacto !== undefined) updateData.contacto = contacto;
    if (capacidad !== undefined) updateData.capacidad = capacidad;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (instalaciones !== undefined) updateData.instalaciones = instalaciones;
    if (disponibilidad !== undefined) updateData.disponibilidad = disponibilidad;
    if (images !== undefined) updateData.images = images;
    if (redesSociales !== undefined) updateData.redesSociales = redesSociales;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    
    await space.update(updateData);
    
    res.json({
      success: true,
      message: 'Espacio cultural actualizado exitosamente',
      space
    });
  } catch (error) {
    console.error('Error al actualizar espacio cultural:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el espacio cultural',
      error: error.message
    });
  }
};

// Actualizar la URL de una imagen de un espacio cultural
exports.updateImageUrl = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { imageUrl, index } = req.body;
    
    if (!spaceId || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del espacio y la URL de la imagen'
      });
    }
    
    const space = await CulturalSpace.findByPk(spaceId);
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Espacio cultural no encontrado'
      });
    }
    
    // Obtener las imágenes actuales
    let images = space.images || [];
    
    // Si es un array, actualizar la imagen en el índice especificado
    if (Array.isArray(images)) {
      if (index !== undefined && index >= 0) {
        // Si el índice existe, actualizar esa posición
        if (index < images.length) {
          images[index] = imageUrl;
        } else {
          // Si el índice no existe, añadir la imagen al final
          images.push(imageUrl);
        }
      } else {
        // Si no se especifica índice, añadir al final
        images.push(imageUrl);
      }
    } else {
      // Si no es un array, crear uno nuevo con la imagen
      images = [imageUrl];
    }
    
    // Actualizar el espacio cultural
    await space.update({ images });
    
    res.json({
      success: true,
      message: 'URL de imagen actualizada exitosamente',
      imageUrl,
      index
    });
  } catch (error) {
    console.error('Error al actualizar URL de imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la URL de la imagen',
      error: error.message
    });
  }
};

// Eliminar un espacio cultural
exports.deleteSpace = async (req, res) => {
  try {
    const { id } = req.params;
    
    const space = await CulturalSpace.findByPk(id);
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Espacio cultural no encontrado'
      });
    }
    
    await space.destroy();
    
    res.json({
      success: true,
      message: 'Espacio cultural eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar espacio cultural:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el espacio cultural',
      error: error.message
    });
  }
};

// Obtener espacios de un gestor específico
exports.getSpacesByManager = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    
    const spaces = await CulturalSpace.findAll({
      where: { managerId: decodedManagerId }
    });
    
    res.json({
      success: true,
      spaces
    });
  } catch (error) {
    console.error('Error al obtener espacios del gestor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener espacios del gestor',
      error: error.message
    });
  }
};
