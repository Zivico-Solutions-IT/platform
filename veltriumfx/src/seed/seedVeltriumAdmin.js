require('../config/env');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const { User, Wallet } = require('../models');
const ensureSchema = require('../config/ensureSchema');

const ALL_PERMISSIONS = ['overview', 'marginAlerts', 'users', 'userManagement', 'assignUsers', 'userManagementUsers', 'verifications', 'deposits', 'depositAddresses', 'depositsList', 'referrals', 'withdrawals', 'withdrawalsList', 'withdrawalDetails', 'userLevels', 'trades', 'addTrading', 'symbols', 'agents'];

async function seedVeltriumAdmin() {
  await sequelize.authenticate();
  await ensureSchema();

  const email = 'admin@veltriumfx.com';
  const plainPassword = 'admin123';
  const password = await bcrypt.hash(plainPassword, 12);

  const [projects] = await sequelize.query("SELECT id FROM projects WHERE identifier = 'veltriumfx'");
  const projectId = projects[0]?.id || null;

  const [admin, created] = await User.findOrCreate({
    where: { email },
    defaults: {
      name: 'VeltriumFX Admin',
      phone: null,
      password,
      role: 'admin',
      accountType: 'Live',
      permissions: ALL_PERMISSIONS,
      projectId,
    },
  });

  await admin.update({ password, role: 'admin', accountType: 'Live', permissions: ALL_PERMISSIONS, projectId });

  await Wallet.findOrCreate({
    where: { userId: admin.id },
    defaults: { userId: admin.id, projectId, balance: 0, equity: 0, freeFunds: 0 },
  });

  console.log(`✅ VeltriumFX Admin (${email}) permissions updated successfully in veltriumfx_db!`);
  await sequelize.close();
}

seedVeltriumAdmin().catch((err) => {
  console.error('Failed to seed VeltriumFX admin:', err.message);
  process.exitCode = 1;
});
