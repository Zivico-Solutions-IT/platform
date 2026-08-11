const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BonusPost = sequelize.define('BonusPost', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'project_id' },
  title: { type: DataTypes.STRING(120), allowNull: false },
  image: { type: DataTypes.TEXT('long'), allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'created_by_id' },
}, { tableName: 'bonus_posts' });

module.exports = BonusPost;
