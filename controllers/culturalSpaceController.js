// Controlador para espacios culturales
// Gestiona operaciones CRUD y disponibilidad de espacios

const CulturalSpace = require('../models/CulturalSpace');
const { User } = require('../models/User');
const SpaceAvailability = require('../models/SpaceAvailability');
const BlockedSlot = require('../models/BlockedSlot');
const { Manager } = require('../models/Manager');
const { Op } = require('sequelize');

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

exports.createSpace = async (req, res) => {
  try {
    let managerId = req.params.managerId;
    
    if (!managerId && req.body && req.body.managerId) {
      managerId = req.body.managerId;
    }
    
    const decodedManagerId = managerId ? decodeURIComponent(managerId) : null;
    
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

exports.getSpaceAvailability = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { date } = req.query;
    
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`Obteniendo disponibilidad para manager: ${decodedManagerId}${date ? `, fecha: ${date}` : ', fecha: No especificada'}`);
    
    let isSpecificDate = false;
    
    let availability = [];
    
    if (date) {
      isSpecificDate = true;
      console.log(`Buscando disponibilidad específica para fecha: ${date}`);
      
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
        const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
        
        if (manager) {
          console.log(`Manager encontrado, buscando con ID: ${manager.id}`);
          
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
            isSpecificDate = false; 
          }
        }
      }
      
      if (availability.length === 0) {
        console.log(`No se encontró disponibilidad para la fecha ${date}, buscando configuración general`);
        isSpecificDate = false;
      }
    }
    
    if (!isSpecificDate) {
      console.log('Buscando disponibilidad general (sin fecha específica)');
      
      try {
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
          const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
          
          if (manager) {
            console.log(`Manager encontrado, buscando con ID: ${manager.id}`);
            
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
      }
    }
    
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
    
    const formattedAvailability = {};
    availability.forEach(item => {
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

exports.updateSpaceAvailability = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { availability, date } = req.body;
    
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`Actualizando disponibilidad para manager: ${decodedManagerId}, fecha: ${date || 'No especificada'}`);
    
    if (!availability || typeof availability !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos para actualizar disponibilidad'
      });
    }
    
    if (date) {
      console.log(`Eliminando configuraciones existentes SOLO para la fecha específica: ${date}`);
      await SpaceAvailability.destroy({
        where: { 
          managerId: decodedManagerId,
          date: date  
        }
      });
    } else {
      console.log('Eliminando configuraciones generales existentes (sin fecha específica)');
      await SpaceAvailability.destroy({
        where: { 
          managerId: decodedManagerId,
          date: null  
        }
      });
    }
    

    const createdRecords = [];
    
    for (const day in availability) {
      if (availability.hasOwnProperty(day)) {
        const hours = availability[day];
        
        if (Array.isArray(hours)) {
          const recordData = {
            managerId: decodedManagerId,
            dayOfWeek: parseInt(day),
            hourSlots: hours 
          };
          
          if (date) {
            
            const [year, month, day] = date.split('-').map(num => parseInt(num, 10));
            
            const dateObj = new Date(year, month - 1, day);
            
            dateObj.setHours(12, 0, 0, 0); 
            
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

exports.getBlockedSlots = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`Buscando slots bloqueados para manager: ${decodedManagerId}`);
    
    const blockedSlots = await BlockedSlot.findAll({
      where: { 
        managerId: decodedManagerId
      }
    });
    
    console.log(`Encontrados ${blockedSlots.length} slots bloqueados`);
    
    const formattedSlots = blockedSlots.map(slot => {
      const dateValue = slot.dateStr || slot.date;
      
      let dayOfWeek = 0;
      try {
        if (dateValue) {
          const dateObj = new Date(dateValue);
          dayOfWeek = dateObj.getDay(); 
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

exports.blockSlot = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { date, hour, dateStr, isRecurring = false } = req.body;
    
    if ((!date && !dateStr) || hour === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos para bloquear slot: se requiere fecha y hora'
      });
    }
    
    const decodedManagerId = decodeURIComponent(managerId);
    
    const finalDate = dateStr || date;
    
    const dateObj = new Date(finalDate);
    const dayOfWeek = dateObj.getDay(); 
    const slotData = {
      managerId: decodedManagerId,
      hour: parseInt(hour),
      isRecurring: Boolean(isRecurring)
    };
    
    if (dateStr) {
      slotData.dateStr = dateStr;
    }
    if (date) {
      slotData.date = date;
      if (!dateStr) {
        slotData.dateStr = date;
      }
    }
    
    console.log('Intentando bloquear slot con datos:', slotData);
    
    const whereCondition = {
      managerId: decodedManagerId,
      hour: parseInt(hour)
    };
    
    if (dateStr) {
      whereCondition.dateStr = dateStr;
    } else if (date) {
      whereCondition.dateStr = date;
    }
    
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

exports.unblockSlot = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { date, hour, dateStr } = req.body;
    
    if ((!date && !dateStr) || hour === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos para desbloquear slot: se requiere fecha y hora'
      });
    }
    
    const decodedManagerId = decodeURIComponent(managerId);
    
    const whereCondition = {
      managerId: decodedManagerId,
      hour: parseInt(hour)
    };
    
    if (dateStr) {
      whereCondition.dateStr = dateStr;
    }
    if (date) {
      whereCondition.date = date;
      if (!dateStr) {
        whereCondition.dateStr = date;
      }
    }
    
    console.log('Intentando desbloquear slot con condiciones:', whereCondition);
    
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

exports.getSpaceByManagerId = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    const decodedManagerId = decodeURIComponent(managerId);
    
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
    
    const decodedManagerId = managerId ? decodeURIComponent(managerId) : null;
    
    const space = await CulturalSpace.findByPk(id);
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Espacio cultural no encontrado'
      });
    }
    
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
    
    let images = space.images || [];
    
    if (Array.isArray(images)) {
      if (index !== undefined && index >= 0) {
        if (index < images.length) {
          images[index] = imageUrl;
        } else {
          images.push(imageUrl);
        }
      } else {
        images.push(imageUrl);
      }
    } else {
      images = [imageUrl];
    }
    
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

exports.getSpacesByManager = async (req, res) => {
  try {
    const { managerId } = req.params;
    
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
