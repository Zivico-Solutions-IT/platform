const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A master can optionally require this single code for public registrations.
// It is kept separate from every client's personal referral code.
const RegistrationCode = sequelize.define('RegistrationCode', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, field: 'project_id' },
  code: { type: DataTypes.STRING(40), allowNull: false },
  updatedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'updated_by_id' },
}, { tableName: 'registration_codes' });

module.exports = RegistrationCode;
