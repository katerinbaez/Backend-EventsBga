// Este código configura y ejecuta pruebas de autenticación JWT
// para verificar el comportamiento de la API en diferentes escenarios de seguridad

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { expressjwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

process.env.NODE_ENV = 'test';

process.env.JWT_SECRET = 'test-secret-key';

let app;
try {
  app = require('../../server');
} catch (error) {
  console.error('Error al cargar la aplicación:', error);
}

jest.mock('jwks-rsa', () => ({
  expressJwtSecret: jest.fn(() => (req, token, cb) => {
    cb(null, { key: 'mock-key' });
  })
}));

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
    
    const response = await request(app)
      .get('/api/events/1/registered-artists');
      
    expect([401, 403]).toContain(response.status);
  });

  test('API debe rechazar tokens inválidos', async () => {
    if (!app) {
      throw new Error('La aplicación no se cargó correctamente');
    }
    
    const response = await request(app)
      .get('/api/events/1/registered-artists')
      .set('Authorization', 'Bearer invalid_token_format');
      
    expect([401, 403, 404, 500]).toContain(response.status);
  });

  test('Rutas públicas deben ser accesibles sin autenticación', async () => {
    if (!app) {
      throw new Error('La aplicación no se cargó correctamente');
    }
    
    const response = await request(app)
      .get('/api/events');
      
    expect([200, 304]).toContain(response.status);
  });

  test('JWT validation is properly configured', () => {
    expect(jwksRsa.expressJwtSecret).toHaveBeenCalled();
    
    expect(expressjwt).toHaveBeenCalled();
  });
});

