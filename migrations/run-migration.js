// Script para ejecutar migración SQL directa
// Permite valores nulos en artistId de EventAttendances

const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function runMigration() {
  try {
    console.log('Iniciando migración para permitir valores nulos en artistId de EventAttendances...');
    
    await sequelize.query(`
      ALTER TABLE "EventAttendances" 
      ALTER COLUMN "artistId" DROP NOT NULL;
    `, { type: QueryTypes.RAW });
    
    console.log('Migración completada exitosamente.');
  } catch (error) {
    console.error('Error al ejecutar la migración:', error);
  } finally {
    await sequelize.close();
  }
}

runMigration();
