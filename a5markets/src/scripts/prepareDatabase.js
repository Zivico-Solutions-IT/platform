require('../config/env');
const { validateEnvironment } = require('../config/env');
const sequelize = require('../config/db');
require('../models');
const ensureSchema = require('../config/ensureSchema');

async function prepareDatabase() {
  validateEnvironment();
  await sequelize.authenticate();
  await sequelize.sync();
  await ensureSchema();
  console.log('Database schema is ready.');
}

prepareDatabase()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error('Database preparation failed:', error?.parent?.code || error?.message || error);
    await sequelize.close().catch(() => {});
    process.exitCode = 1;
  });
