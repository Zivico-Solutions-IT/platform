require('dotenv').config({ quiet: true });

const sequelize = require('../config/db');
require('../models');

const run = async () => {
  await sequelize.authenticate();
  await sequelize.query('ALTER TABLE candles MODIFY volume DECIMAL(30,8) NOT NULL DEFAULT 0');
  console.log('Updated candles.volume to DECIMAL(30,8)');
};

run()
  .catch((error) => {
    console.error('Candle volume migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
