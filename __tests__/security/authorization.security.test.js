// Este código verifica la autorización y roles de usuarios
// para asegurar que solo los usuarios con permisos adecuados puedan acceder a ciertas rutas

const request = require('supertest');
const jwt = require('jsonwebtoken');


process.env.NODE_ENV = 'test';

process.env.JWT_SECRET = 'test-secret-key';

let app;
try {
  app = require('../../server');
} catch (error) {
  console.error('Error al cargar la aplicación:', error);
}

describe('Authorization Security Tests', () => {
  test('Protected routes should require authentication', async () => {
    if (!app) {
      throw new Error('La aplicación no se cargó correctamente');
    }
    
    const response = await request(app)
      .get('/api/events/1/registered-artists');
      
    expect([401, 403, 404]).toContain(response.status);
  });

  test('API endpoints should validate permissions', async () => {
    if (!app) {
      throw new Error('La aplicación no se cargó correctamente');
    }
    
    const deleteResponse = await request(app)
      .delete('/api/events/123');
      
    expect([401, 403, 404]).toContain(deleteResponse.status);
  });

  test('Public endpoints should be accessible without authentication', async () => {
    if (!app) {
      throw new Error('La aplicación no se cargó correctamente');
    }
    
    const publicResponse = await request(app)
      .get('/api/events');
      
    expect(publicResponse.status).toBe(200);
  });
});
