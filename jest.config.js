// Configuración de Jest
// Configura pruebas y cobertura de código para el backend

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
  forceExit: true,
  testTimeout: 10000,
  detectOpenHandles: true,
  setupFilesAfterEnv: ['./jest.setup.js'],
  verbose: true,
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
