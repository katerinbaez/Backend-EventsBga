const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const BlockedSlot = require('../models/BlockedSlot');
const { Op } = require('sequelize');

// Obtener todos los slots bloqueados de un espacio
router.get('/space/:spaceId', async (req, res) => {
  try {
    const { spaceId } = req.params;
    
    // Obtener la fecha actual
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    const blockedSlots = await BlockedSlot.findAll({
      where: {
        managerId: spaceId,
        // Solo mostrar slots bloqueados actuales o futuros
        [Op.or]: [
          // Para slots recurrentes (semanales)
          { isRecurring: true },
          // Para slots específicos de fecha
          {
            isRecurring: false,
            // Aquí iría la condición de fecha, pero como no tenemos un campo de fecha específico
            // en el modelo actual, tendríamos que adaptarlo según la estructura real
          }
        ]
      },
      order: [
        ['day', 'ASC'],
        ['hour', 'ASC']
      ]
    });
    
    // Formatear los datos para el frontend
    const formattedBlockedSlots = blockedSlots.map(slot => {
      // Mapear los días de la semana si es recurrente
      const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      
      return {
        id: slot.id,
        day: slot.day,
        dayName: slot.dayName || (slot.day !== null ? dayNames[slot.day] : null),
        hour: slot.hour,
        isRecurring: slot.isRecurring,
        // Formatear la hora para mostrarla en formato HH:MM
        startTime: `${slot.hour.toString().padStart(2, '0')}:00`,
        endTime: `${(slot.hour + 1).toString().padStart(2, '0')}:00`
      };
    });
    
    return res.status(200).json({ 
      success: true, 
      blockedSlots: formattedBlockedSlots 
    });
  } catch (error) {
    console.error('Error al obtener slots bloqueados:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener los slots bloqueados del espacio',
      error: error.message
    });
  }
});

// Crear un nuevo slot bloqueado
router.post('/space/:spaceId', authenticateToken, async (req, res) => {
  try {
    const { spaceId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Verificar que el usuario sea un gestor o administrador
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para bloquear slots' 
      });
    }
    
    const { day, hour, isRecurring, dayName } = req.body;
    
    // Validar datos
    if (hour === undefined || (isRecurring && day === undefined)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos o inválidos' 
      });
    }
    
    // Verificar si ya existe un slot bloqueado para esa hora y día
    const existingSlot = await BlockedSlot.findOne({
      where: {
        managerId: spaceId,
        day,
        hour,
        isRecurring
      }
    });
    
    if (existingSlot) {
      return res.status(400).json({ 
        success: false, 
        message: 'Este slot ya está bloqueado' 
      });
    }
    
    // Crear nuevo slot bloqueado
    const blockedSlot = await BlockedSlot.create({
      managerId: spaceId,
      day,
      hour,
      isRecurring,
      dayName,
      createdBy: userId
    });
    
    return res.status(201).json({ 
      success: true, 
      message: 'Slot bloqueado exitosamente', 
      blockedSlot 
    });
  } catch (error) {
    console.error('Error al bloquear slot:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al bloquear el slot',
      error: error.message
    });
  }
});

// Eliminar un slot bloqueado
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Verificar que el usuario sea un gestor o administrador
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para desbloquear slots' 
      });
    }
    
    const blockedSlot = await BlockedSlot.findByPk(id);
    
    if (!blockedSlot) {
      return res.status(404).json({ 
        success: false, 
        message: 'Slot bloqueado no encontrado' 
      });
    }
    
    await blockedSlot.destroy();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Slot desbloqueado exitosamente' 
    });
  } catch (error) {
    console.error('Error al desbloquear slot:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al desbloquear el slot',
      error: error.message
    });
  }
});

module.exports = router;
