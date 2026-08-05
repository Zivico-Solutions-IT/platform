const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { User, Wallet, TradingAccount, Project, AdminNotification } = require('../models');
const { ensureReferralCode } = require('../services/dashboardService');
const { sendPasswordResetCode } = require('../services/mailSevice');
const { getIo } = require('../config/socketIo');

const publicUser = (user) => {
  const values = user.toJSON ? user.toJSON() : user;
  delete values.password;
  delete values.resetPasswordToken;
  delete values.resetPasswordExpires;
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
    const { name, email, phone, password, accountType, referralCode } = req.body;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: 'Name, email and password of at least 8 characters are required.' });
    const selectedAccountType = accountType === 'Live' ? 'Live' : 'Demo';
    const startingBalance = selectedAccountType === 'Demo' ? 5000 : 0;
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ where: { email: normalizedEmail } })) return res.status(409).json({ message: 'Email already registered.' });
    const referrer = referralCode
      ? await User.findOne({ where: { referralCode: String(referralCode).trim() } })
      : null;
      
    // Extract project ID from headers if frontend is on a subdomain
    const headerProjectId = req.headers['x-project-id'];
    const projectId = headerProjectId ? parseInt(headerProjectId, 10) : (referrer ? referrer.projectId : null);
    if (projectId) {
      const project = await Project.findByPk(projectId);
      if (!project || project.status === 'inactive') return res.status(403).json({ message: 'This company is inactive. Registration is unavailable.' });
    }

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
    await user.update({ lastLoginAt: new Date(), onlineUntil: onlineUntil() });

    // Create admin notification for new user registration
    try {
      // Reload user with latest fields (referralCode, etc.)
      const freshUser = await User.findByPk(user.id, {
        attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires', 'idProofImage', 'addressProofImage', 'profileImage'] },
      });

      const notification = await AdminNotification.create({
        projectId: user.projectId || null,
        type: 'new_user',
        title: 'New User Registered',
        message: `${user.name} (${user.email}) has just registered a new ${user.accountType} account.`,
        referenceType: 'user',
        referenceId: user.id,
        userId: user.id,
      });

      const io = getIo();
      if (io) {
        io.emit('admin:notification', {
          id: notification.id,
          type: 'new_user',
          title: notification.title,
          message: notification.message,
          referenceType: 'user',
          referenceId: user.id,
          userId: user.id,
          projectId: user.projectId || null,
          createdAt: notification.createdAt,
          // Full user object so admin panel can show the new user immediately
          user: freshUser ? {
            id: freshUser.id,
            name: freshUser.name,
            email: freshUser.email,
            phone: freshUser.phone || null,
            country: freshUser.country || null,
            accountType: freshUser.accountType,
            leverage: freshUser.leverage,
            tradingLevel: freshUser.tradingLevel,
            tradingStatus: freshUser.tradingStatus,
            verificationStatus: freshUser.verificationStatus,
            role: freshUser.role,
            referralCode: freshUser.referralCode || null,
            referredById: freshUser.referredById || null,
            projectId: freshUser.projectId || null,
            onlineUntil: freshUser.onlineUntil,
            lastLoginAt: freshUser.lastLoginAt,
            createdAt: freshUser.createdAt,
          } : null,
        });
      }
    } catch (notifError) {
      console.error('[auth] Failed to create admin notification for new user:', notifError.message);
    }

    return res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: String(email || '').trim().toLowerCase() }, include: [{ model: Wallet, as: 'wallet' }] });
    if (!user || !(await bcrypt.compare(String(password || ''), user.password))) return res.status(401).json({ message: 'Invalid email or password.' });
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

exports.me = async (req, res, next) => {
  try {
    let user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] }, include: [{ model: Wallet, as: 'wallet' }] });
    if (!user && req.user) {
      user = req.user;
    }
    if (user) {
      await ensureReferralCode(user).catch(() => {});
    }
    return res.json({ user: user || req.user });
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
