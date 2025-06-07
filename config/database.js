// Configuración de conexión a la base de datos PostgreSQL
// Maneja conexiones tanto en entorno de desarrollo como producción

const { Sequelize } = require('sequelize');
const fs = require('fs');
require('dotenv').config();

const dialectOptions = {
  ssl: {
    ca: process.env.DB_SSL_CA,
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  }
};

let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: dialectOptions,
    ssl: true
  });
} else {
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    dialectOptions: dialectOptions
  });
}

module.exports = sequelize;
