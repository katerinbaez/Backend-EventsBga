// Script de migración de base de datos
// Ejecuta las migraciones pendientes usando Umzug

const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('./config/database');

const umzug = new Umzug({
  migrations: { glob: 'migrations/*.js' },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

(async () => {
  await umzug.up();
  console.log('Migrations completed successfully');
  process.exit(0);
})();
