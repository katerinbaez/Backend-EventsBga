// Rutas de espacios culturales
// Gestiona la disponibilidad y bloqueo de horarios de espacios

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const SpaceAvailability = require('../models/SpaceAvailability');
const { Op } = require('sequelize');

router.get('/space/:spaceId', async (req, res) => {
  try {
    const { spaceId } = req.params;
    
    const availabilities = await SpaceAvailability.findAll({
      where: {
        managerId: spaceId
      },
      order: [['dayOfWeek', 'ASC']]
    });
    
    const formattedAvailabilities = availabilities.map(availability => {
      const hourSlots = availability.hourSlots || [];
      
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

router.post('/space/:spaceId', authenticateToken, async (req, res) => {
  try {
    const { spaceId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para gestionar disponibilidades' 
      });
    }
    
    const { dayOfWeek, hourSlots } = req.body;
    
    if (dayOfWeek === undefined || !hourSlots || !Array.isArray(hourSlots)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos o inválidos' 
      });
    }
    
    let availability = await SpaceAvailability.findOne({
      where: {
        managerId: spaceId,
        dayOfWeek
      }
    });
    
    if (availability) {
      availability.hourSlots = hourSlots;
      await availability.save();
    } else {
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

router.delete('/space/:spaceId/day/:dayOfWeek', authenticateToken, async (req, res) => {
  try {
    const { spaceId, dayOfWeek } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para eliminar disponibilidades' 
      });
    }
    
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
