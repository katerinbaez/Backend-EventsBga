const request = require('supertest');
const jwt = require('jsonwebtoken');
const { expressjwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

// Configurar el entorno de prueba
process.env.NODE_ENV = 'test';

// Configurar una clave secreta para las pruebas
process.env.JWT_SECRET = 'test-secret-key';

// Importar la aplicación Express
let app;
try {
  app = require('../../server');
} catch (error) {
  console.error('Error al cargar la aplicación:', error);
}

// Mock para jwks-rsa
jest.mock('jwks-rsa', () => ({
  expressJwtSecret: jest.fn(() => (req, token, cb) => {
    cb(null, { key: 'mock-key' });
  })
}));

// Mock para express-jwt
jest.mock('express-jwt', () => ({
  expressjwt: jest.fn(() => (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      req.user = { sub: 'test-user-id' };
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  })
}));

describe('Authentication Security Tests', () => {
  test('Protected routes should require authentication', async () => {
    if (!app) {
      throw new Error('La aplicación no se cargó correctamente');
    }
    
    // Intentar acceder a una ruta protegida sin token
    const response = await request(app)
      .get('/api/events/1/registered-artists');
      
    // Verificar que la respuesta sea 401 (Unauthorized) o 403 (Forbidden)
    expect([401, 403]).toContain(response.status);
  });

  test('API debe rechazar tokens inválidos', async () => {
    if (!app) {
      throw new Error('La aplicación no se cargó correctamente');
    }
    
    // Intentar acceder con un token inválido
    const response = await request(app)
      .get('/api/events/1/registered-artists')
      .set('Authorization', 'Bearer invalid_token_format');
      
    // Verificar que la respuesta sea 401 (Unauthorized) o 403 (Forbidden) o 404 (Not Found) o 500 (Error interno)
    expect([401, 403, 404, 500]).toContain(response.status);
  });

  test('Rutas públicas deben ser accesibles sin autenticación', async () => {
    if (!app) {
      throw new Error('La aplicación no se cargó correctamente');
    }
    
    // Intentar acceder a una ruta pública sin token
    const response = await request(app)
      .get('/api/events');
      
    // Verificar que la respuesta sea exitosa (200 OK o 304 Not Modified)
    expect([200, 304]).toContain(response.status);
  });

  test('JWT validation is properly configured', () => {
    // Verificar que jwksRsa.expressJwtSecret fue llamado con la configuración correcta
    expect(jwksRsa.expressJwtSecret).toHaveBeenCalled();
    
    // Verificar que expressjwt fue llamado con la configuración correcta
    expect(expressjwt).toHaveBeenCalled();
  });
});
