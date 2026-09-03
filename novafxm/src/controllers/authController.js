const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { User, Wallet, TradingAccount, Project, RegistrationCode } = require('../models');
const { ensureReferralCode } = require('../services/dashboardService');
const { sendPasswordResetCode, sendEmailVerificationCode } = require('../services/mailSevice');

const publicUser = (user) => {
  const values = user.toJSON ? user.toJSON() : user;
  delete values.password;
  delete values.resetPasswordToken;
  delete values.resetPasswordExpires;
  delete values.emailVerificationToken;
  delete values.emailVerificationExpires;
  // Documents are fetched only by the protected verification endpoints. Sending
  // multi-megabyte base64 files with every profile refresh delays KYC UI updates.
  delete values.idProofImage;
  delete values.addressProofImage;
  return values;
};
const DEFAULT_LEVERAGE = 500;
const ONLINE_WINDOW_MS = 45 * 1000;

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required.');
  return process.env.JWT_SECRET;
};

const tokenFor = (user) => jwt.sign({ id: user.id, role: user.role, email: user.email }, secret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const onlineUntil = () => new Date(Date.now() + ONLINE_WINDOW_MS);

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const emailVerificationCode = () => String(crypto.randomInt(100000, 1000000));
const emailVerificationExpiry = () => new Date(Date.now() + 15 * 60 * 1000);

const issueEmailVerificationCode = async (user) => {
  const code = emailVerificationCode();
  await user.update({
    emailVerificationToken: hashResetToken(code),
    emailVerificationExpires: emailVerificationExpiry(),
  });
  await sendEmailVerificationCode({ to: user.email, code });
};

const ensureStaffClientAccounts = async (user) => {
  if (!['agent', 'manager', 'master'].includes(user?.role)) return;
  const projectId = user.projectId || null;
  await Wallet.findOrCreate({
    where: { userId: user.id, projectId },
    defaults: { userId: user.id, projectId, balance: 0, equity: 0, freeFunds: 0 },
  });
  await TradingAccount.findOrCreate({
    where: { userId: user.id, projectId, isPrimary: true },
    defaults: {
      userId: user.id,
      projectId,
      type: 'Demo',
      name: 'Demo account 1',
      balance: 5000,
      leverage: DEFAULT_LEVERAGE,
      status: 'active',
      isPrimary: true,
    },
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, accountType, referralCode, referralInviteCode } = req.body;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: 'Name, email and password of at least 8 characters are required.' });
    const selectedAccountType = accountType === 'Live' ? 'Live' : 'Demo';
    const startingBalance = selectedAccountType === 'Demo' ? 5000 : 0;
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      if (existingUser.emailVerifiedAt || existingUser.role !== 'user') {
        return res.status(409).json({ message: 'Email already registered.' });
      }
      try {
        await issueEmailVerificationCode(existingUser);
      } catch (mailError) {
        return res.json({
          verificationRequired: true,
          email: normalizedEmail,
          deliveryFailed: true,
          message: 'Your account is already created, but the verification email could not be sent. Please contact support or ask the master administrator to verify your email.',
        });
      }
      return res.json({ verificationRequired: true, email: normalizedEmail, message: 'A new verification code was sent to your email.' });
    }
    // NovaFXM public registrations are controlled by the one code configured
    // in CRM. Personal referral links use referralInviteCode separately.
    const headerProjectId = Number.parseInt(req.headers['x-project-id'], 10);
    const project = Number.isInteger(headerProjectId)
      ? await Project.findByPk(headerProjectId)
      : await Project.findOne({ where: { identifier: 'novafxm' } });
    if (!project || project.status === 'inactive') return res.status(403).json({ message: 'Please contact support for assistance.' });

    const configuredCode = await RegistrationCode.findOne({ where: { projectId: project.id } });
    const suppliedCode = String(referralCode || '').trim().toUpperCase();
    if (!configuredCode || suppliedCode !== String(configuredCode.code).trim().toUpperCase()) {
      return res.status(403).json({ message: 'Please contact support for assistance.' });
    }

    const referrer = referralInviteCode
      ? await User.findOne({ where: { referralCode: String(referralInviteCode).trim(), projectId: project.id } })
      : null;
    const projectId = project.id;

    const verificationCode = emailVerificationCode();
    const user = await sequelize.transaction(async (transaction) => {
      const created = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone,
        password: await bcrypt.hash(password, 12),
        accountType: selectedAccountType,
        leverage: DEFAULT_LEVERAGE,
        tradingStatus: 'active',
        verificationStatus: 'unverified',
        referredById: referrer?.id || null,
        projectId: projectId,
        emailVerificationToken: hashResetToken(verificationCode),
        emailVerificationExpires: emailVerificationExpiry(),
      }, { transaction });
      const walletBalance = selectedAccountType === 'Live' ? startingBalance : 0;
      // Registration is public, so it does not run inside the authenticated
      // tenant context. Persist the resolved project explicitly on every
      // tenant-owned record created here.
      await Wallet.create({
        userId: created.id,
        projectId,
        balance: walletBalance,
        equity: walletBalance,
        freeFunds: walletBalance,
      }, { transaction });
      await TradingAccount.create({
        userId: created.id,
        projectId,
        type: selectedAccountType,
        name: `${selectedAccountType} account 1`,
        balance: startingBalance,
        leverage: DEFAULT_LEVERAGE,
        status: 'active',
        isPrimary: true,
      }, { transaction });
      return created;
    });
    await ensureReferralCode(user);
    try {
      await sendEmailVerificationCode({ to: normalizedEmail, code: verificationCode });
    } catch (mailError) {
      // The account, wallet and trading account have already been committed.
      // Keep the registration usable even when the mail provider is down: the
      // master can verify the account from User Management, or the user can
      // request another code later.
      return res.status(201).json({
        verificationRequired: true,
        email: normalizedEmail,
        deliveryFailed: true,
        message: 'Your account was created, but the verification email could not be sent. Please contact support or ask the master administrator to verify your email.',
      });
    }

    return res.status(201).json({
      verificationRequired: true,
      email: normalizedEmail,
      message: 'Verification code sent to your email.',
    });

  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: String(email || '').trim().toLowerCase() }, include: [{ model: Wallet, as: 'wallet' }] });
    if (!user || !(await bcrypt.compare(String(password || ''), user.password))) return res.status(401).json({ message: 'Invalid email or password.' });
    if (user.role === 'user' && !user.emailVerifiedAt) return res.status(403).json({ message: 'Verify your email address before logging in.' });
    if (user.role !== 'master' && user.projectId) {
      const project = await Project.findByPk(user.projectId);
      if (!project || project.status === 'inactive') return res.status(403).json({ message: 'This company is inactive. Access is currently unavailable.' });
      if (project.status === 'suspended' && ['admin', 'agent', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: 'This company console is frozen. Contact support to unlock.' });
      }
    }
    await ensureStaffClientAccounts(user);
    if (['agent', 'manager', 'master'].includes(user.role)) {
      await user.reload({ include: [{ model: Wallet, as: 'wallet' }] });
    }
    await ensureReferralCode(user);
    await user.update({ lastLoginAt: new Date(), onlineUntil: onlineUntil() });
    return res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Enter the 6-digit verification code.' });
    const user = await User.findOne({
      where: {
        email,
        emailVerificationToken: hashResetToken(code),
        emailVerificationExpires: { [Op.gt]: new Date() },
      },
      include: [{ model: Wallet, as: 'wallet' }],
    });
    if (!user) return res.status(400).json({ message: 'Verification code is invalid or expired.' });
    await user.update({
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpires: null,
      lastLoginAt: new Date(),
      onlineUntil: onlineUntil(),
    });
    return res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { return next(error); }
};

exports.resendEmailVerification = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const user = await User.findOne({ where: { email } });
    if (user && user.role === 'user' && !user.emailVerifiedAt) await issueEmailVerificationCode(user);
    return res.json({ message: 'If that account is awaiting verification, a new code has been sent.' });
  } catch (error) { return next(error); }
};

exports.me = async (req, res, next) => {
  try {
    // authenticate already loaded the current user record. Do not make a second
    // database query (or wait for a referral write) before returning KYC status.
    const user = req.user;
    if (user) ensureReferralCode(user).catch(() => {});
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

exports.presence = async (req, res, next) => {
  try {
    const nextOnlineUntil = onlineUntil();
    await req.user.update({ onlineUntil: nextOnlineUntil });
    return res.json({ onlineUntil: nextOnlineUntil });
  } catch (error) {
    return next(error);
  }
};

exports.offline = async (req, res, next) => {
  try {
    await req.user.update({ lastLogoutAt: new Date(), onlineUntil: new Date(0) });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.json({ message: 'If that email exists, a reset code has been sent.' });

    const resetToken = String(crypto.randomInt(100000, 1000000));
    await user.update({
      resetPasswordToken: hashResetToken(resetToken),
      resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
    });

    try {
      await sendPasswordResetCode({ to: user.email, code: resetToken });
    } catch (mailError) {
      await user.update({ resetPasswordToken: null, resetPasswordExpires: null });
      return res.status(500).json({ message: mailError.message || 'Reset code email could not be sent.' });
    }

    return res.json({ message: 'Password reset code sent to your email. Use it within 15 minutes.' });
  } catch (error) {
    return next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const resetToken = String(req.body.resetToken || '').trim();
    const password = String(req.body.password || '');
    if (!resetToken) return res.status(400).json({ message: 'Reset code is required.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashResetToken(resetToken),
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });
    if (!user) return res.status(400).json({ message: 'Reset code is invalid or expired.' });

    await user.update({
      password: await bcrypt.hash(password, 12),
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    return next(error);
  }
};
