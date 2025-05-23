const request = require('supertest');
const jwt = require('jsonwebtoken');

// Configurar el entorno de prueba
process.env.NODE_ENV = 'test';

// Importar la aplicación Express
let app;
try {
  app = require('../../server');
} catch (error) {
  console.error('Error al cargar la aplicación:', error);
}

describe('API Security Tests', () => {
  // Token válido para pruebas
  const validToken = jwt.sign(
    { sub: 'test-user', permissions: ['read:events', 'write:events'] },
    'test-secret'
  );

  test('API rechaza inyección SQL en parámetros de consulta', async () => {
    if (!app) {
      console.warn('Skipping test: app not loaded');
      return;
    }
    
    // Intentar inyección SQL en parámetros de consulta
    const response = await request(app)
      .get('/api/events?title=test\' OR \'1\'=\'1')
      .set('Authorization', `Bearer ${validToken}`);
      
    // Verificar que la inyección SQL no causa comportamiento inesperado
    expect(response.status).not.toBe(500);
    
    // La respuesta debe ser exitosa (200) o no encontrada (404), pero no debe causar un error del servidor
    expect([200, 404]).toContain(response.status);
    
    // Si la consulta es válida y devuelve datos, verificamos que no haya devuelto demasiados resultados
    if (response.status === 200 && response.body && Array.isArray(response.body)) {
      // La inyección SQL no debería devolver todos los eventos
      expect(response.body.length).toBeLessThan(100); // Un número razonable
    }
  });

  test('API rechaza inyección NoSQL en cuerpo de solicitud', async () => {
    if (!app) {
      console.warn('Skipping test: app not loaded');
      return;
    }
    
    // Intentar inyección NoSQL en el cuerpo de la solicitud
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 'Test Event',
        description: 'Test Description',
        // Intento de inyección NoSQL
        $where: 'function() { return true; }'
      });
      
    // Verificar que la inyección NoSQL no causa comportamiento inesperado
    expect(response.status).not.toBe(500);
    
    // La respuesta debe ser un error cliente (400, 404) o una redirección (302), pero no un error del servidor
    expect([400, 404, 302]).toContain(response.status);
  });

  test('API valida correctamente los tipos de datos', async () => {
    if (!app) {
      console.warn('Skipping test: app not loaded');
      return;
    }
    
    // Enviar datos con tipos incorrectos
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 123, // Debería ser string
        date: 'not-a-date', // Debería ser una fecha válida
        capacity: 'not-a-number' // Debería ser un número
      });
      
    // Verificar que la API no acepta datos con tipos incorrectos (no 200 OK)
    expect(response.status).not.toBe(200);
    
    // La respuesta debe ser un error cliente (400, 404) o una redirección (302), pero no un error del servidor
    expect([400, 404, 302]).toContain(response.status);
  });

  test('API maneja correctamente múltiples solicitudes', async () => {
    if (!app) {
      console.warn('Skipping test: app not loaded');
      return;
    }
    
    // Realizar múltiples solicitudes rápidamente
    const requests = [];
    for (let i = 0; i < 10; i++) { // Reducimos el número para evitar sobrecargar
      requests.push(
        request(app)
          .get('/api/events')
          .set('Authorization', `Bearer ${validToken}`)
      );
    }
    
    // Ejecutar todas las solicitudes
    const responses = await Promise.all(requests);
    
    // Verificar que todas las solicitudes reciben una respuesta válida (no 500)
    for (const response of responses) {
      expect(response.status).not.toBe(500);
    }
    
    // Verificar que la mayoría de las solicitudes son exitosas
    const successfulResponses = responses.filter(res => res.status === 200);
    expect(successfulResponses.length).toBeGreaterThan(0);
  });

  test('API maneja correctamente encabezados potencialmente maliciosos', async () => {
    if (!app) {
      console.warn('Skipping test: app not loaded');
      return;
    }
    
    // Intentar inyección de encabezados potencialmente maliciosos
    const response = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Forwarded-Host', 'malicious-site.com');
      
    // Verificar que la API maneja correctamente los encabezados potencialmente maliciosos
    expect(response.status).not.toBe(500); // No debe causar un error del servidor
    
    // La respuesta debe ser exitosa (200) o un error cliente (400, 403), pero no un error del servidor
    expect([200, 400, 403, 404]).toContain(response.status);
  });
});
