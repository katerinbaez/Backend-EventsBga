const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const SpaceAvailability = require('../models/SpaceAvailability');
const { Op } = require('sequelize');

// Obtener todas las disponibilidades de un espacio
router.get('/space/:spaceId', async (req, res) => {
  try {
    const { spaceId } = req.params;
    
    const availabilities = await SpaceAvailability.findAll({
      where: {
        managerId: spaceId // Usando managerId como referencia al espacio
      },
      order: [['dayOfWeek', 'ASC']]
    });
    
    // Formatear los datos para el frontend
    const formattedAvailabilities = availabilities.map(availability => {
      const hourSlots = availability.hourSlots || [];
      
      // Mapear los días de la semana
      const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const dayName = dayNames[availability.dayOfWeek];
      
      return {
        id: availability.id,
        day: dayName,
        dayOfWeek: availability.dayOfWeek,
        timeSlots: hourSlots.map(slot => ({
          start: slot.start,
          end: slot.end
        }))
      };
    });
    
    return res.status(200).json({ 
      success: true, 
      availabilities: formattedAvailabilities 
    });
  } catch (error) {
    console.error('Error al obtener disponibilidades:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las disponibilidades del espacio',
      error: error.message
    });
  }
});

// Crear o actualizar disponibilidad para un espacio
router.post('/space/:spaceId', authenticateToken, async (req, res) => {
  try {
    const { spaceId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Verificar que el usuario sea un gestor o administrador
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para gestionar disponibilidades' 
      });
    }
    
    const { dayOfWeek, hourSlots } = req.body;
    
    // Validar datos
    if (dayOfWeek === undefined || !hourSlots || !Array.isArray(hourSlots)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos o inválidos' 
      });
    }
    
    // Buscar si ya existe una disponibilidad para ese día
    let availability = await SpaceAvailability.findOne({
      where: {
        managerId: spaceId,
        dayOfWeek
      }
    });
    
    if (availability) {
      // Actualizar disponibilidad existente
      availability.hourSlots = hourSlots;
      await availability.save();
    } else {
      // Crear nueva disponibilidad
      availability = await SpaceAvailability.create({
        managerId: spaceId,
        dayOfWeek,
        hourSlots
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Disponibilidad actualizada exitosamente', 
      availability 
    });
  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar la disponibilidad',
      error: error.message
    });
  }
});

// Eliminar disponibilidad para un día específico
router.delete('/space/:spaceId/day/:dayOfWeek', authenticateToken, async (req, res) => {
  try {
    const { spaceId, dayOfWeek } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Verificar que el usuario sea un gestor o administrador
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para eliminar disponibilidades' 
      });
    }
    
    // Buscar la disponibilidad
    const availability = await SpaceAvailability.findOne({
      where: {
        managerId: spaceId,
        dayOfWeek
      }
    });
    
    if (!availability) {
      return res.status(404).json({ 
        success: false, 
        message: 'Disponibilidad no encontrada' 
      });
    }
    
    await availability.destroy();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Disponibilidad eliminada exitosamente' 
    });
  } catch (error) {
    console.error('Error al eliminar disponibilidad:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar la disponibilidad',
      error: error.message
    });
  }
});

module.exports = router;
