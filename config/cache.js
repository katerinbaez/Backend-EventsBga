// Configuración de caché usando Redis
// Implementa middleware para cachear respuestas de la API

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

const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    if (!redis) {
      return next();
    }

    try {
      const key = `__express__${req.originalUrl}`;
      const cachedResponse = await redis.get(key);

      if (cachedResponse) {
        return res.json(JSON.parse(cachedResponse));
      }

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
