const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One global SMTP sender configuration. The password is never exposed through
// the API after it has been saved.
module.exports = sequelize.define('MailSettings', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, defaultValue: 1 },
  smtpUser: { type: DataTypes.STRING(190), field: 'smtp_user', allowNull: true },
  smtpPass: { type: DataTypes.TEXT, field: 'smtp_pass', allowNull: true },
  mailFrom: { type: DataTypes.STRING(255), field: 'mail_from', allowNull: true },
  updatedById: { type: DataTypes.INTEGER.UNSIGNED, field: 'updated_by_id', allowNull: true },
}, { tableName: 'mail_settings' });
