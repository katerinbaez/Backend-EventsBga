const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('../config/database');

// Configurar Umzug para manejar migraciones
const umzug = new Umzug({
  migrations: { 
    glob: 'migrations/20250504-modify-favorite-targetId.js',
    resolve: ({ name, path, context }) => {
      const migration = require(path);
      return {
        name,
        up: async () => migration.up(context.queryInterface, context.sequelize),
        down: async () => migration.down(context.queryInterface, context.sequelize),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

// Ejecutar migración
(async () => {
  try {
    await umzug.up();
    console.log('Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
})();
