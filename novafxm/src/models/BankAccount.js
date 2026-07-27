const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BankAccount = sequelize.define('BankAccount', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'user_id' },
  accountHolderName: { type: DataTypes.STRING(120), allowNull: false, field: 'account_holder_name' },
  bankName: { type: DataTypes.STRING(120), allowNull: false, field: 'bank_name' },
  branchName: { type: DataTypes.STRING(120), allowNull: true, field: 'branch_name' },
  accountNumber: { type: DataTypes.STRING(80), allowNull: false, field: 'account_number' },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'delete_pending'), allowNull: false, defaultValue: 'pending' },
  reviewedAt: { type: DataTypes.DATE, field: 'reviewed_at', allowNull: true },
  reviewedBy: { type: DataTypes.INTEGER.UNSIGNED, field: 'reviewed_by', allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, field: 'project_id', allowNull: true },
}, { tableName: 'bank_accounts' });

module.exports = BankAccount;
