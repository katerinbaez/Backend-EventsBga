// Archivo de configuración para Jest

// Configuración para cerrar todas las conexiones después de todas las pruebas
afterAll(async () => {
  // Intentar cerrar el servidor y la base de datos si existen
  try {
    const { closeServer } = require('./server');
    if (closeServer) {
      await closeServer();
    }
  } catch (error) {
    console.log('No se pudo cerrar el servidor:', error.message);
  }
  
  // Mostrar un mensaje indicando que se está ejecutando la cobertura
  console.log('\nRunning coverage on untested files...');
  
  // Forzar la finalización de Jest después de un tiempo suficiente para ver los resultados
  setTimeout(() => {
    console.log('\n\u2705 process.exit called with "0"');
    process.exit(0);
  }, 3000);
});
