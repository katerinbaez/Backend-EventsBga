// Controlador de favoritos
// Gestiona operaciones CRUD y verificación de favoritos

const Favorite = require('../models/Favorite');
const Event = require('../models/Event');
const Artist = require('../models/Artist');
const CulturalSpace = require('../models/CulturalSpace');

exports.checkFavorite = async (req, res) => {
  try {
    const { userId, eventId } = req.query;

    if (!userId || !eventId) {
      return res.status(400).json({ 
        success: false,
        message: 'Se requieren userId y eventId',
        isFavorite: false
      });
    }

    console.log(`Verificando favorito para usuario ${userId} y evento ${eventId}`);

    const targetIdStr = String(eventId);
    console.log(`Verificando favorito con targetId: ${eventId}, convertido a string: ${targetIdStr}`);

    let numericId = targetIdStr;
    if (isNaN(parseInt(targetIdStr))) {
      const hashCode = str => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash % 1000000); 
      };
      numericId = hashCode(targetIdStr);
      console.log(`Convertido UUID ${eventId} a ID numérico ${numericId}`);
    } else {
      numericId = parseInt(targetIdStr);
    }

    const favorite = await Favorite.findOne({
      where: {
        userId,
        targetType: 'event',
        targetId: numericId
      }
    });

    if (favorite) {
      return res.json({ 
        success: true,
        isFavorite: true 
      });
    }

    const simpleFavorite = await Favorite.findOne({
      where: {
        userId,
        targetId: numericId
      }
    });

    return res.json({ 
      success: true,
      isFavorite: !!simpleFavorite 
    });
  } catch (error) {
    console.error('Error al verificar favorito:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al verificar favorito',
      isFavorite: false
    });
  }
};


exports.getUserFavorites = async (req, res) => {
  try {
    const { userId, targetType } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'Se requiere el parámetro userId' 
      });
    }
    
    console.log('Obteniendo favoritos para el usuario:', userId);
    
    const whereClause = { userId };
    
    if (targetType) {
      whereClause.targetType = targetType;
    }
    
    const favorites = await Favorite.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    console.log(`Se encontraron ${favorites.length} favoritos`);

    const enrichedFavorites = await Promise.all(favorites.map(async (fav) => {
      let details = null;
      const favoriteData = {
        id: fav.id,
        userId: fav.userId,
        targetType: fav.targetType,
        targetId: fav.targetId,
        createdAt: fav.createdAt
      };
      
      try {
        switch (fav.targetType) {
          case 'event':
            details = await Event.findByPk(fav.targetId);
            break;
          case 'artist':
            details = await Artist.findOne({
              where: { id: fav.targetId }
            });
            
            if (!details) {
              console.log(`No se encontró artista con ID exacto ${fav.targetId}, buscando alternativas...`);
              const allArtists = await Artist.findAll();
              
              for (const artist of allArtists) {
                if (artist.id.toString() === fav.targetId.toString()) {
                  details = artist;
                  console.log(`Encontrado artista por comparación de strings: ${artist.id}`);
                  break;
                }
              }
            }
            break;
          case 'space':
            details = await CulturalSpace.findByPk(fav.targetId);
            break;
        }
        
        if (details) {
          console.log(`Detalles encontrados para ${fav.targetType} con ID ${fav.targetId}`);
          return {
            ...favoriteData,
            details: details.toJSON()
          };
        } else {
          console.log(`No se encontraron detalles para ${fav.targetType} con ID ${fav.targetId}`);
          return favoriteData;
        }
      } catch (error) {
        console.error(`Error al obtener detalles para ${fav.targetType} con ID ${fav.targetId}:`, error);
        return favoriteData;
      }
    }));

    console.log(`Enviando ${enrichedFavorites.length} favoritos enriquecidos`);
    res.json(enrichedFavorites);
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener favoritos',
      error: error.message
    });
  }
};

exports.addToFavorites = async (req, res) => {
  try {
    const { userId, targetType, targetId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'Se requiere el parámetro userId' 
      });
    }

    if (!['event', 'artist', 'space'].includes(targetType)) {
      return res.status(400).json({ message: 'Tipo de objetivo inválido' });
    }

    const targetIdStr = String(targetId);
    console.log(`Procesando targetId: ${targetId}, convertido a string: ${targetIdStr}`);

    const existing = await Favorite.findOne({
      where: {
        userId,
        targetType,
        targetId: targetIdStr
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Ya está en favoritos' });
    }

    const favorite = await Favorite.create({
      userId,
      targetType,
      targetId: targetIdStr
    });

    res.status(201).json(favorite);
  } catch (error) {
    console.error('Error al agregar favorito:', error);
    res.status(500).json({ message: 'Error al agregar a favoritos' });
  }
};

exports.removeFromFavorites = async (req, res) => {
  try {
    const { userId, targetType, targetId } = req.body;

    if (!userId || !targetType || !targetId) {
      return res.status(400).json({ 
        success: false,
        message: 'Se requieren los parámetros userId, targetType y targetId' 
      });
    }

    const targetIdStr = String(targetId);
    console.log(`Eliminando favorito con targetId: ${targetId}, convertido a string: ${targetIdStr}`);

    const result = await Favorite.destroy({
      where: {
        userId,
        targetType,
        targetId: targetIdStr
      }
    });

    if (!result) {
      return res.status(404).json({ message: 'Favorito no encontrado' });
    }

    res.json({ message: 'Eliminado de favoritos' });
  } catch (error) {
    console.error('Error al eliminar favorito:', error);
    res.status(500).json({ message: 'Error al eliminar de favoritos' });
  }
};
