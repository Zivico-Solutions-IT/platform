const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ReferralReward = sequelize.define('ReferralReward', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, field: 'project_id', allowNull: true },
  referrerId: { type: DataTypes.INTEGER.UNSIGNED, field: 'referrer_id', allowNull: false },
  refereeId: { type: DataTypes.INTEGER.UNSIGNED, field: 'referee_id', allowNull: false },
  depositId: { type: DataTypes.INTEGER.UNSIGNED, field: 'deposit_id', allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
  reviewedAt: { type: DataTypes.DATE, field: 'reviewed_at', allowNull: true },
  reviewedBy: { type: DataTypes.INTEGER.UNSIGNED, field: 'reviewed_by', allowNull: true },
}, { tableName: 'referral_rewards' });

module.exports = ReferralReward;
