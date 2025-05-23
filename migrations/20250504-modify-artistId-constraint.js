'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Modificar la columna artistId para permitir valores nulos
    await queryInterface.sequelize.query(`
      ALTER TABLE "EventAttendances" 
      ALTER COLUMN "artistId" DROP NOT NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir el cambio si es necesario
    await queryInterface.sequelize.query(`
      ALTER TABLE "EventAttendances" 
      ALTER COLUMN "artistId" SET NOT NULL;
    `);
  }
};
