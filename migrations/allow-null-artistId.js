// Migración para permitir artistId nulo en Events
// Permite crear eventos sin especificar un artista

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Events', 'artistId', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Events', 'artistId', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
