'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('BlockedSlots', 'day', {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 6
      },
      comment: 'Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)'
    });

    await queryInterface.addColumn('BlockedSlots', 'dayName', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Nombre del día (Domingo, Lunes, Martes, etc.)'
    });

    console.log('✅ Columnas day y dayName añadidas a la tabla BlockedSlots');
    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('BlockedSlots', 'day');
    await queryInterface.removeColumn('BlockedSlots', 'dayName');
    
    console.log('✅ Columnas day y dayName eliminadas de la tabla BlockedSlots');
    return Promise.resolve();
  }
};
