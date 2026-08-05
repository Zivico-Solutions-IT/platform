require('dotenv').config();
const { User } = require('./src/models');
const sequelize = require('./src/config/db');

async function listUsers() {
  try {
    const users = await User.findAll({
      where: { role: ['admin', 'master', 'manager', 'agent'] },
      attributes: ['id', 'name', 'email', 'role', 'permissions', 'projectId'],
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

listUsers();
