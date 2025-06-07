// Migración para cambiar tipo de targetId en Favorites
// Convierte targetId de INTEGER a STRING para mayor flexibilidad

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Favorites', 'targetId', {
      type: Sequelize.STRING,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Favorites', 'targetId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};
