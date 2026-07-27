const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'user_id' },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, field: 'project_id', allowNull: true },
  type: { type: DataTypes.ENUM('deposit', 'withdrawal', 'admin_add_balance', 'admin_deduct_balance', 'trade_profit', 'trade_loss', 'reset_demo'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  bonus: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  balanceBefore: { type: DataTypes.DECIMAL(15, 2), field: 'balance_before' },
  balanceAfter: { type: DataTypes.DECIMAL(15, 2), field: 'balance_after' },
  note: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'), allowNull: false, defaultValue: 'pending' },
  referenceType: { type: DataTypes.STRING(40), field: 'reference_type' },
  referenceId: { type: DataTypes.INTEGER.UNSIGNED, field: 'reference_id' },
  description: { type: DataTypes.STRING(255) },
}, { tableName: 'transactions' });

module.exports = Transaction;
