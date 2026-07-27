const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SymbolVisibility = sequelize.define('SymbolVisibility', {
  symbol: { type: DataTypes.STRING(50), primaryKey: true, allowNull: false },
  visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, field: 'project_id', allowNull: true },
}, { tableName: 'symbol_visibilities', timestamps: false });

module.exports = SymbolVisibility;
