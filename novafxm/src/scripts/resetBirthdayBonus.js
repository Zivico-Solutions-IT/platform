require('dotenv').config();
const { Transaction } = require('../models');

async function reset() {
  try {
    const currentYear = new Date().getFullYear().toString();
    const deletedCount = await Transaction.destroy({
      where: {
        type: 'admin_add_balance',
        referenceType: 'birthday_bonus',
        description: currentYear
      }
    });
    console.log(`Deleted ${deletedCount} birthday bonus transactions for testing.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

reset();
