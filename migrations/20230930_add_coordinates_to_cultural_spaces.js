// Migración para agregar coordenadas a espacios culturales
// Agrega columnas latitude y longitude con validaciones geográficas


'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('CulturalSpaces', 'latitude', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: -90,
        max: 90
      }
    });

    await queryInterface.addColumn('CulturalSpaces', 'longitude', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: -180,
        max: 180
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('CulturalSpaces', 'latitude');
    await queryInterface.removeColumn('CulturalSpaces', 'longitude');
  }
};
