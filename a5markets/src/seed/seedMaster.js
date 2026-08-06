require('../config/env');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const { User, Wallet } = require('../models');
const ensureSchema = require('../config/ensureSchema');

async function seedMaster() {
  await sequelize.authenticate();
  await ensureSchema();

  const bcrypt = require('bcryptjs');
  const masterPassword = await bcrypt.hash('master123', 12);
  const adminPassword = await bcrypt.hash('admin123', 12);

  // 1. Ensure master@novafxm.com
  const [master, masterCreated] = await User.findOrCreate({
    where: { email: 'master@novafxm.com' },
    defaults: {
      name: 'Master Admin',
      email: 'master@novafxm.com',
      password: masterPassword,
      role: 'master',
      accountType: 'Demo',
      leverage: 500,
    },
  });
  if (!masterCreated) {
    await master.update({ password: masterPassword, role: 'master' });
  }

  // 2. Ensure the A5 Markets administrator
  const [admin, adminCreated] = await User.findOrCreate({
    where: { email: 'admin@a5markets.com' },
    defaults: {
      name: 'A5 Markets Admin',
      email: 'admin@a5markets.com',
      password: adminPassword,
      role: 'admin',
      accountType: 'Live',
      projectId: 1,
    },
  });
  if (!adminCreated) {
    await admin.update({ password: adminPassword, role: 'admin' });
  }

  console.log('✅ Shared master account is ready for A5 Markets.');
  console.log('✅ A5 Markets administrator is ready.');
  await sequelize.close();
}

seedMaster().catch((err) => {
  console.error('Failed to seed A5 Markets master data:', err.message);
  process.exitCode = 1;
});
