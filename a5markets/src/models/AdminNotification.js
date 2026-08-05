const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AdminNotification = sequelize.define('AdminNotification', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, field: 'project_id', allowNull: true },
  type: {
    type: DataTypes.ENUM(
      'new_user',
      'new_deposit',
      'new_withdrawal',
      'kyc_submitted',
      'bank_account_pending',
      'user_notification'
    ),
    allowNull: false,
  },
  title: { type: DataTypes.STRING(200), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: true },
  referenceType: { type: DataTypes.STRING(80), allowNull: true, field: 'reference_type' },
  referenceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'reference_id' },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'user_id' },
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_read' },
  readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
}, { tableName: 'admin_notifications' });

module.exports = AdminNotification;
