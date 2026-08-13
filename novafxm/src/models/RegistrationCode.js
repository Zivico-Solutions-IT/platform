const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One master-managed access code per company.  This is deliberately separate
// from a user's personal referral code so referral links continue to work.
const RegistrationCode = sequelize.define('RegistrationCode', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, field: 'project_id' },
  code: { type: DataTypes.STRING(40), allowNull: false },
  updatedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'updated_by_id' },
}, { tableName: 'registration_codes' });

module.exports = RegistrationCode;
