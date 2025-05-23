module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  // Configuraciones para manejar operaciones asíncronas
  forceExit: true, // Forzar a Jest a salir después de todas las pruebas
  testTimeout: 10000, // Aumentar el tiempo de espera para las pruebas
  detectOpenHandles: true, // Detectar conexiones abiertas
  setupFilesAfterEnv: ['./jest.setup.js'], // Archivo de configuración para Jest
  verbose: true, // Mostrar resultados detallados
  // Configuraciones para mostrar la cobertura de código
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    }
  }
};
