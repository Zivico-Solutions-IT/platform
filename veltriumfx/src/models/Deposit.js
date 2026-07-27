const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Deposit = sequelize.define('Deposit', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'user_id' },
  tradingAccountId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'trading_account_id' },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, field: 'project_id', allowNull: true },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  bonus: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'USD' },
  paymentMethod: { type: DataTypes.STRING(80), allowNull: false, field: 'payment_method' },
  depositAddressId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'deposit_address_id' },
  depositAddressLabel: { type: DataTypes.STRING(120), allowNull: true, field: 'deposit_address_label' },
  depositAddress: { type: DataTypes.TEXT, allowNull: true, field: 'deposit_address' },
  referenceNumber: { type: DataTypes.STRING(120), allowNull: true, field: 'reference_number' },
  receiptImage: { type: DataTypes.TEXT('long'), allowNull: true, field: 'receipt_image' },
  note: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
  reviewedAt: { type: DataTypes.DATE, field: 'reviewed_at' },
  reviewedBy: { type: DataTypes.INTEGER.UNSIGNED, field: 'reviewed_by' },
}, { tableName: 'deposits' });

module.exports = Deposit;
