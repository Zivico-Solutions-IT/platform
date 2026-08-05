require('../config/env');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const { User, Wallet } = require('../models');
const ensureSchema = require('../config/ensureSchema');

async function seedAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const plainPassword = String(process.env.ADMIN_PASSWORD || '');
  if (!email || plainPassword.length < 12) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) are required.');
  }
  const password = await bcrypt.hash(plainPassword, 12);
  const [admin] = await User.findOrCreate({
    where: { email },
    defaults: { name: 'NOVA FXM Admin', phone: null, password, role: 'admin', accountType: 'Live' },
  });
  if (admin.role !== 'admin') await admin.update({ password, role: 'admin', accountType: 'Live' });
  await Wallet.findOrCreate({ where: { userId: admin.id }, defaults: { balance: 0 } });
  return admin;
}

if (require.main === module) {
  sequelize.authenticate()
    .then(() => sequelize.sync())
    .then(ensureSchema)
    .then(seedAdmin)
    .then(() => {
      console.log(`Administrator account is ready: ${process.env.ADMIN_EMAIL}`);
      return sequelize.close();
    })
    .catch((error) => {
      console.error('Unable to seed administrator:', error.message);
      process.exitCode = 1;
    });
}

module.exports = seedAdmin;
