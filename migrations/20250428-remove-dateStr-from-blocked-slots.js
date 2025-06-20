// Migración para eliminar columna dateStr de BlockedSlots
// Simplifica la estructura de datos manteniendo solo la fecha

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('BlockedSlots', 'dateStr');
      console.log('Columna dateStr eliminada de la tabla BlockedSlots');
      return Promise.resolve();
    } catch (error) {
      console.error('Error al eliminar la columna dateStr de BlockedSlots:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('BlockedSlots', 'dateStr', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Fecha en formato string para compatibilidad'
      });
      console.log('Columna dateStr recreada en la tabla BlockedSlots');
      return Promise.resolve();
    } catch (error) {
      console.error('Error al recrear la columna dateStr en BlockedSlots:', error);
      return Promise.reject(error);
    }
  }
};
