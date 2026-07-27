const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Candle = sequelize.define('Candle', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  symbol: { type: DataTypes.STRING(30), allowNull: false },
  timeframe: { type: DataTypes.STRING(10), allowNull: false },
  time: { type: DataTypes.BIGINT, allowNull: false },
  open: { type: DataTypes.DECIMAL(20, 8), allowNull: false },
  high: { type: DataTypes.DECIMAL(20, 8), allowNull: false },
  low: { type: DataTypes.DECIMAL(20, 8), allowNull: false },
  close: { type: DataTypes.DECIMAL(20, 8), allowNull: false },
  volume: { type: DataTypes.DECIMAL(30, 8), allowNull: false, defaultValue: 0 },
}, {
  tableName: 'candles',
  indexes: [
    { unique: true, fields: ['symbol', 'timeframe', 'time'] },
    { fields: ['symbol', 'timeframe', 'time'] },
  ],
});

module.exports = Candle;
