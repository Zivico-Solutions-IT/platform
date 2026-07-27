const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TradingAccount = sequelize.define('TradingAccount', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'user_id' },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, field: 'project_id', allowNull: true },
  type: { type: DataTypes.ENUM('Demo', 'Live'), allowNull: false, defaultValue: 'Demo' },
  name: { type: DataTypes.STRING(80), allowNull: false },
  balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  leverage: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 500 },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
  status: { type: DataTypes.ENUM('active', 'pending', 'disabled'), allowNull: false, defaultValue: 'active' },
  isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_primary' },
}, { tableName: 'trading_accounts' });

module.exports = TradingAccount;
