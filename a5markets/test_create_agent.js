require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('./src/models');
const sequelize = require('./src/config/db');

async function test() {
  try {
    const password = await bcrypt.hash('testpassword123', 12);
    
    // Attempt to create a user with role 'agent' directly in sequelize
    const agent = await User.create({
      name: 'Test Agent',
      email: 'testagent1@gmail.com',
      phone: '123456789',
      password: password,
      role: 'agent',
      permissions: ['overview'],
    });
    console.log("Successfully created agent:", agent.id);
  } catch (err) {
    console.error("FAILED to create agent:", err);
  } finally {
    await sequelize.close();
  }
}

test();
