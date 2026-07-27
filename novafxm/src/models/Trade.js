const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Trade = sequelize.define('Trade', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'user_id' },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, field: 'project_id', allowNull: true },
  tradingAccountId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'trading_account_id' },
  symbol: { type: DataTypes.STRING(30), allowNull: false },
  side: { type: DataTypes.ENUM('BUY', 'SELL'), allowNull: false },
  lots: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  orderType: { type: DataTypes.ENUM('market', 'limit', 'stop'), allowNull: false, defaultValue: 'market', field: 'order_type' },
  entryPrice: { type: DataTypes.DECIMAL(18, 8), allowNull: true, field: 'entry_price' },
  openPrice: { type: DataTypes.DECIMAL(18, 8), allowNull: false, field: 'open_price' },
  stopLoss: { type: DataTypes.DECIMAL(18, 8), allowNull: true, field: 'stop_loss' },
  takeProfit: { type: DataTypes.DECIMAL(18, 8), allowNull: true, field: 'take_profit' },
  closePrice: { type: DataTypes.DECIMAL(18, 8), field: 'close_price' },
  profit: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  margin: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'open', 'closed'), allowNull: false, defaultValue: 'open' },
  closedAt: { type: DataTypes.DATE, field: 'closed_at' },
}, { tableName: 'trades' });

module.exports = Trade;
