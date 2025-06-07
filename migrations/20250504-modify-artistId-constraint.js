// Migración para modificar restricción de artistId en EventAttendances
// Permite valores nulos en la columna artistId

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "EventAttendances" 
      ALTER COLUMN "artistId" DROP NOT NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "EventAttendances" 
      ALTER COLUMN "artistId" SET NOT NULL;
    `);
  }
};
