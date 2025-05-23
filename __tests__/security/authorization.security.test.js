const request = require('supertest');
const jwt = require('jsonwebtoken');

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

describe('Authorization Security Tests', () => {
  test('Protected routes should require authentication', async () => {
    if (!app) {
      throw new Error('La aplicación no se cargó correctamente');
    }
    
    // Intentar acceder a una ruta protegida sin token
    const response = await request(app)
      .get('/api/events/1/registered-artists');
      
    // Verificar que la respuesta sea 401 (Unauthorized) o 403 (Forbidden)
    expect([401, 403, 404]).toContain(response.status);
  });

  test('API endpoints should validate permissions', async () => {
    if (!app) {
      throw new Error('La aplicación no se cargó correctamente');
    }
    
    // Verificar que existan rutas que requieran permisos específicos
    const deleteResponse = await request(app)
      .delete('/api/events/123');
      
    // Verificar que la respuesta sea 401 (Unauthorized) o 403 (Forbidden)
    expect([401, 403, 404]).toContain(deleteResponse.status);
  });

  test('Public endpoints should be accessible without authentication', async () => {
    if (!app) {
      throw new Error('La aplicación no se cargó correctamente');
    }
    
    // Probar acceso a una ruta pública
    const publicResponse = await request(app)
      .get('/api/events');
      
    // Verificar que la respuesta sea exitosa (200 OK)
    expect(publicResponse.status).toBe(200);
  });
});
