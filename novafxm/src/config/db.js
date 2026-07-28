const { Sequelize } = require('sequelize');
const tenantStorage = require('./tenantStorage');

// Validation runs before authenticate(). Non-routable placeholders keep module
// construction from crashing before the HTTP health server can start.
const sequelize = new Sequelize(
  process.env.DB_NAME || 'configuration_missing',
  process.env.DB_USER || 'configuration_missing',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'configuration.invalid',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    pool: {
      max: Number(process.env.DB_POOL_MAX || 5),
      min: 0,
      acquire: Number(process.env.DB_ACQUIRE_TIMEOUT_MS || 30000),
      idle: Number(process.env.DB_IDLE_TIMEOUT_MS || 10000),
    },
    dialectOptions: {
      connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 15000),
    },
    define: { underscored: true, timestamps: true },
  },
);

const tenantStorage = require('./tenantStorage');

function applyTenantScope(options) {
  if (options.skipProjectId) return;
  const store = tenantStorage.getStore();
  if (store && store.projectId !== undefined) {
    // Determine the model for this operation
    const model = this;
    if (model && model.rawAttributes && model.rawAttributes.projectId) {
      options.where = options.where || {};
      // Do not override if explicitly passed
      if (options.where.projectId === undefined) {
        options.where.projectId = store.projectId;
      }
    }
  }
}

sequelize.addHook('beforeFind', applyTenantScope);
sequelize.addHook('beforeCount', applyTenantScope);
sequelize.addHook('beforeUpdate', applyTenantScope);
sequelize.addHook('beforeDestroy', applyTenantScope);
sequelize.addHook('beforeCreate', (instance, options) => {
  if (options.skipProjectId) return;
  const store = tenantStorage.getStore();
  if (store && store.projectId !== undefined) {
    if (instance.rawAttributes && instance.rawAttributes.projectId) {
      if (instance.projectId === undefined || instance.projectId === null) {
        instance.projectId = store.projectId;
      }
    }
  }
});

module.exports = sequelize;
