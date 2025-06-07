// Migración para permitir artistId nulo en EventAttendances
// Permite registrar asistencia sin especificar un artista

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('EventAttendances', 'artistId', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('EventAttendances', 'artistId', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
