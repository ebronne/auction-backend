// config/db.js
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite' // or path to your .sqlite file
});

module.exports = sequelize;
