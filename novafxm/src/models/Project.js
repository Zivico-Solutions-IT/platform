const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Project = sequelize.define('Project', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  identifier: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  status: { type: DataTypes.ENUM('active', 'inactive', 'suspended'), allowNull: false, defaultValue: 'active' },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('permissions');
      if (typeof rawValue === 'string') {
        try { return JSON.parse(rawValue); } catch (e) { return []; }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    }
  },
  symbolVisibility: {
    type: DataTypes.JSON,
    field: 'symbol_visibility',
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('symbolVisibility');
      if (typeof rawValue === 'string') {
        try { return JSON.parse(rawValue); } catch (e) { return {}; }
      }
      return rawValue || {};
    }
  },
}, { tableName: 'projects' });

module.exports = Project;
