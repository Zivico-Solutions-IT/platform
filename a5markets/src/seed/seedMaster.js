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

  // 2. Ensure admin@novafxm.com
  const [admin, adminCreated] = await User.findOrCreate({
    where: { email: 'admin@novafxm.com' },
    defaults: {
      name: 'NOVA FXM Admin',
      email: 'admin@novafxm.com',
      password: adminPassword,
      role: 'admin',
      accountType: 'Live',
      projectId: 1,
    },
  });
  if (!adminCreated) {
    await admin.update({ password: adminPassword, role: 'admin' });
  }

  console.log('✅ NovaFXM Master (master@novafxm.com / master123) is ready!');
  console.log('✅ NovaFXM Admin (admin@novafxm.com / admin123) is ready!');
  await sequelize.close();
}

seedMaster().catch((err) => {
  console.error('Failed to seed NovaFXM Master:', err.message);
  process.exitCode = 1;
});
