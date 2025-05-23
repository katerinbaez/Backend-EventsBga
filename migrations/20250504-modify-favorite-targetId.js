'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Favorites', 'targetId', {
      type: Sequelize.STRING,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Nota: Esta migración de reversión podría fallar si hay datos que no pueden convertirse a INTEGER
    await queryInterface.changeColumn('Favorites', 'targetId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};
