const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Wallet = sequelize.define('Wallet', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, field: 'user_id' },
  balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 5000 },
  equity: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 5000 },
  margin: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  freeFunds: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 5000, field: 'free_funds' },
  bonus: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  marginLevel: { type: DataTypes.DECIMAL(20, 2), field: 'margin_level', defaultValue: 0.00 },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, field: 'project_id', allowNull: true },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
}, { tableName: 'wallets' });

module.exports = Wallet;
