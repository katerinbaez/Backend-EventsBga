const { Op } = require('sequelize');
const Event = require('../models/Event');
const EventRequest = require('../models/EventRequest');

// Obtener todas las categorías
exports.getAllCategories = async (req, res) => {
  try {
    // Obtener categorías únicas de la tabla Events
    const eventCategories = await Event.findAll({
      attributes: ['categoria'],
      group: ['categoria'],
      where: {
        categoria: {
          [Op.ne]: null
        }
      }
    });

    // Obtener categorías únicas de la tabla EventRequests
    const requestCategories = await EventRequest.findAll({
      attributes: ['categoria'],
      group: ['categoria'],
      where: {
        categoria: {
          [Op.ne]: null
        }
      }
    });

    // Combinar y eliminar duplicados
    const allCategories = [
      ...eventCategories.map(item => item.categoria),
      ...requestCategories.map(item => item.categoria)
    ];
    
    // Eliminar duplicados y valores nulos
    const uniqueCategories = [...new Set(allCategories)].filter(Boolean);
    
    // Transformar a formato de categorías
    const formattedCategories = uniqueCategories.map((nombre, index) => ({
      id: index + 1,
      nombre,
      descripcion: `Eventos de ${nombre}`,
      color: getColorForCategory(nombre)
    }));
    
    res.json(formattedCategories);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error al obtener las categorías' });
  }
};

// Función auxiliar para asignar colores a las categorías
function getColorForCategory(category) {
  const colors = {
    'Música': '#FF3A5E',
    'Teatro': '#4A90E2',
    'Danza': '#50E3C2',
    'Arte': '#F5A623',
    'Literatura': '#9013FE',
    'Cine': '#B8E986',
    'Fotografía': '#4A4A4A',
    'Gastronomía': '#D0021B'
  };
  
  return colors[category] || '#FF3A5E'; // Color por defecto
}
