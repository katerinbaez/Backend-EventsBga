const { Sequelize } = require('sequelize');
const fs = require('fs');
require('dotenv').config();

// Configuración para entorno de producción o desarrollo
const dialectOptions = {
  ssl: {
    ca: process.env.DB_SSL_CA,
    // En producción, esto debería ser true para mayor seguridad
    // En desarrollo, puede ser false para permitir certificados autofirmados
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  }
};

// Si estamos en Railway o similar, usamos la URL de la base de datos directamente
let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: dialectOptions,
    ssl: true
  });
} else {
  // Configuración tradicional con parámetros individuales
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    dialectOptions: dialectOptions
  });
}

module.exports = sequelize;
