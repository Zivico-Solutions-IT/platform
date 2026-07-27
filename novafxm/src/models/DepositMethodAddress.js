const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DepositMethodAddress = sequelize.define('DepositMethodAddress', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  paymentMethod: { type: DataTypes.STRING(80), allowNull: false, field: 'payment_method' },
  label: { type: DataTypes.STRING(120), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: false },
  qrData: { type: DataTypes.TEXT, allowNull: true, field: 'qr_data' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  currency: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'USD' },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, field: 'project_id', allowNull: true },
}, { tableName: 'deposit_method_addresses' });

module.exports = DepositMethodAddress;
