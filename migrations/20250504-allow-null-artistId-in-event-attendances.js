'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Modificar la columna artistId para permitir valores nulos
    await queryInterface.changeColumn('EventAttendances', 'artistId', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir el cambio si es necesario
    await queryInterface.changeColumn('EventAttendances', 'artistId', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
