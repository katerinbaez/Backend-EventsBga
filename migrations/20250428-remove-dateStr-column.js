// Migración para eliminar columnas dateStr
// Elimina la columna redundante de BlockedSlots y SpaceAvailabilities

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('BlockedSlots', 'dateStr');
      console.log('✅ Columna dateStr eliminada de la tabla BlockedSlots');
      
      await queryInterface.removeColumn('SpaceAvailabilities', 'dateStr');
      console.log('✅ Columna dateStr eliminada de la tabla SpaceAvailabilities');
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error al eliminar columnas dateStr:', error);
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
      console.log('✅ Columna dateStr recreada en la tabla BlockedSlots');
      
      await queryInterface.addColumn('SpaceAvailabilities', 'dateStr', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Fecha en formato string para compatibilidad'
      });
      console.log('✅ Columna dateStr recreada en la tabla SpaceAvailabilities');
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error al recrear columnas dateStr:', error);
      return Promise.reject(error);
    }
  }
};
