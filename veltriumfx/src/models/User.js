const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(190), allowNull: false, unique: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING(30), allowNull: true },
  country: { type: DataTypes.STRING(80), allowNull: true },
  dateOfBirth: { type: DataTypes.STRING(20), field: 'date_of_birth', allowNull: true },
  profileImage: { type: DataTypes.TEXT('long'), field: 'profile_image', allowNull: true },
  bankAccountHolder: { type: DataTypes.STRING(120), field: 'bank_account_holder', allowNull: true },
  bankName: { type: DataTypes.STRING(120), field: 'bank_name', allowNull: true },
  bankBranch: { type: DataTypes.STRING(120), field: 'bank_branch', allowNull: true },
  bankAccountNumber: { type: DataTypes.STRING(80), field: 'bank_account_number', allowNull: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  resetPasswordToken: { type: DataTypes.STRING(64), field: 'reset_password_token', allowNull: true },
  resetPasswordExpires: { type: DataTypes.DATE, field: 'reset_password_expires', allowNull: true },
  lastLoginAt: { type: DataTypes.DATE, field: 'last_login_at', allowNull: true },
  lastLogoutAt: { type: DataTypes.DATE, field: 'last_logout_at', allowNull: true },
  onlineUntil: { type: DataTypes.DATE, field: 'online_until', allowNull: true },
  // Incremented when a Master changes a staff password, invalidating active
  // staff sessions while allowing a fresh sign-in with the new password.
  staffSessionVersion: { type: DataTypes.INTEGER.UNSIGNED, field: 'staff_session_version', allowNull: false, defaultValue: 0 },
  role: { type: DataTypes.ENUM('user', 'admin', 'agent', 'master', 'manager'), allowNull: false, defaultValue: 'user' },
  projectId: { type: DataTypes.INTEGER.UNSIGNED, field: 'project_id', allowNull: true },
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
  accountType: { type: DataTypes.ENUM('Demo', 'Live'), field: 'account_type', defaultValue: 'Demo' },
  leverage: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 500 },
  tradingLevel: { type: DataTypes.ENUM('Standard', 'Silver', 'Gold', 'Platinum'), field: 'trading_level', allowNull: false, defaultValue: 'Standard' },
  tradingStatus: { type: DataTypes.ENUM('active', 'frozen'), field: 'trading_status', allowNull: false, defaultValue: 'active' },
  verificationStatus: { type: DataTypes.ENUM('unverified', 'pending', 'approved', 'rejected'), field: 'verification_status', allowNull: false, defaultValue: 'unverified' },
  idProofImage: { type: DataTypes.TEXT('long'), field: 'id_proof_image', allowNull: true },
  addressProofImage: { type: DataTypes.TEXT('long'), field: 'address_proof_image', allowNull: true },
  verificationReviewedAt: { type: DataTypes.DATE, field: 'verification_reviewed_at', allowNull: true },
  verificationReviewedBy: { type: DataTypes.INTEGER.UNSIGNED, field: 'verification_reviewed_by', allowNull: true },
  adminNotes: { type: DataTypes.TEXT, field: 'admin_notes', allowNull: true },
  referralCode: { type: DataTypes.STRING(40), unique: true, field: 'referral_code', allowNull: true },
  referredById: { type: DataTypes.INTEGER.UNSIGNED, field: 'referred_by_id', allowNull: true },
  assignedAgentId: { type: DataTypes.INTEGER.UNSIGNED, field: 'assigned_agent_id', allowNull: true },
  assignedById: { type: DataTypes.INTEGER.UNSIGNED, field: 'assigned_by_id', allowNull: true },
  assignmentStatus: { type: DataTypes.ENUM('new', 'assigned', 'unassigned'), field: 'assignment_status', allowNull: false, defaultValue: 'new' },
}, { tableName: 'users' });

module.exports = User;
