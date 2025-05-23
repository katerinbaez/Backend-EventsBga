const Redis = require('ioredis');

let redis;
try {
  redis = new Redis(process.env.REDIS_URL);
  
  redis.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  redis.on('connect', () => {
    console.log('Successfully connected to Redis');
  });
} catch (error) {
  console.error('Failed to initialize Redis:', error);
}

/**
 * Middleware para cachear respuestas de la API usando Redis
 * @param {number} duration - Duración del cache en segundos
 * @returns {Function} Middleware function
 */
const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    if (!redis) {
      return next();
    }

    try {
      // Crear una clave única basada en la URL y query params
      const key = `__express__${req.originalUrl}`;
      const cachedResponse = await redis.get(key);

      if (cachedResponse) {
        return res.json(JSON.parse(cachedResponse));
      }

      // Interceptar el método res.json para guardar la respuesta en cache
      res.originalJson = res.json;
      res.json = (body) => {
        try {
          redis.set(key, JSON.stringify(body), 'EX', duration);
        } catch (error) {
          console.error('Redis cache error:', error);
        }
        return res.originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Función para invalidar el cache de una ruta específica
 * @param {string} route - Ruta a invalidar
 */
const invalidateCache = async (route) => {
  if (!redis) return;
  
  try {
    await redis.del(`__express__${route}`);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

module.exports = {
  redis,
  cacheMiddleware,
  invalidateCache
};
