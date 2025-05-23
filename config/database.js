const { Sequelize } = require('sequelize');
const fs = require('fs');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: true,
      ca: fs.readFileSync(process.env.DB_SSL_CA).toString(),
    }
  }
});

module.exports = sequelize;
