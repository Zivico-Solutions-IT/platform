const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Wallet, Deposit, Withdrawal, Transaction, Trade, Candle, TradingAccount, BankAccount, DepositMethodAddress, SymbolVisibility, ReferralReward, Project, AdminNotification, BonusPost, RegistrationCode } = require('../models');
const tradingView = require('../services/tradingViewService');
const { ensureReferralCode } = require('../services/dashboardService');
const { getIo } = require('../config/socketIo');

const DEMO_BALANCE = 5000;
const DEMO_RESET_DEPOSIT = 500;
const DEFAULT_LEVERAGE = 500;
const MIN_LEVERAGE = 100;
const MAX_LEVERAGE = 2000;
const companyProjectFor = async (req) => {
  if (req.projectId) return Project.findByPk(req.projectId);
  return Project.findOne({ where: { identifier: 'novafxm' } });
};
const depositAddressScopeFor = async (req) => {
  const projectId = req.projectId || (await companyProjectFor(req))?.id || null;
  return {
    projectId,
    where: projectId ? { [Op.or]: [{ projectId }, { projectId: null }] } : {},
  };
};
const TRADING_LEVELS = ['Standard', 'Silver', 'Gold', 'Platinum'];
const STAFF_PERMISSIONS = ['overview', 'marginAlerts', 'users', 'userManagement', 'assignUsers', 'userManagementUsers', 'verifications', 'deposits', 'depositAddresses', 'depositsList', 'referrals', 'withdrawals', 'withdrawalsList', 'withdrawalDetails', 'userLevels', 'trades', 'addTrading', 'symbols', 'bonusPosts'];
const publicAttributes = { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] };
const publicListAttributes = {
  exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires', 'profileImage', 'idProofImage', 'addressProofImage'],
};

const ensureStaffClientAccounts = async (user, transaction = undefined) => {
  const projectId = user.projectId || null;
  const options = transaction ? { transaction } : {};
  await Wallet.findOrCreate({
    where: { userId: user.id, projectId },
    defaults: { userId: user.id, projectId, balance: 0, equity: 0, freeFunds: 0 },
    ...options,
  });
  await TradingAccount.findOrCreate({
    where: { userId: user.id, projectId, isPrimary: true },
    defaults: {
      userId: user.id,
      projectId,
      type: 'Demo',
      name: 'Demo account 1',
      balance: DEMO_BALANCE,
      leverage: DEFAULT_LEVERAGE,
      status: 'active',
      isPrimary: true,
    },
    ...options,
  });
};
const leanUserAttributes = [
  'id',
  'name',
  'email',
  'phone',
  'country',
  'accountType',
  'leverage',
  'tradingLevel',
  'tradingStatus',
  'verificationStatus',
  'lastLoginAt',
  'lastLogoutAt',
  'onlineUntil',
  'role',
  'createdAt',
  'updatedAt',
  'referralCode',
  'referredById',
  'assignedAgentId',
  'assignedById',
];
const listLimit = (value, fallback = 100, max = 250) => {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) return fallback;
  return Math.min(limit, max);
};
const money = (value) => Number(Number(value || 0).toFixed(2));
const contractSize = (symbol) => (
  symbol.includes('BTC') || symbol.includes('ETH') || symbol === 'US500'
    ? 1
    : symbol.includes('XAU') || symbol.includes('OIL') ? 100 : 100000
);
const profitFor = (trade, price) => (
  (Number(price) - Number(trade.openPrice))
  * (trade.side === 'BUY' ? 1 : -1)
  * Number(trade.lots)
  * contractSize(trade.symbol)
);

function apiError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

async function getUser(id, transaction) {
  const user = await User.findByPk(id, { attributes: publicAttributes, transaction });
  if (!user) throw apiError('User account not found.', 404);
  return user;
}

async function getLeanUser(id, transaction) {
  const user = await User.findByPk(id, { attributes: publicListAttributes, transaction });
  if (!user) throw apiError('User account not found.', 404);
  return user;
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const clean = (value) => {
  const text = String(value || '').trim();
  return text || null;
};
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
const phoneDigits = (phone) => String(phone || '').replace(/\D/g, '');
const isValidPhone = (phone) => {
  const text = String(phone || '').trim();
  return /^\+\d{1,4}\s*\d[\d\s().-]{5,18}$/.test(text) && phoneDigits(text).length >= 8 && phoneDigits(text).length <= 15;
};
const isImageData = (value) => /^data:image\/(png|jpe?g|webp);base64,/i.test(String(value || ''));

// This intentionally creates a separate, short-lived client session.  The
// administrator's token is never sent to the client-facing application.
exports.impersonateUser = async (req, res, next) => {
  try {
    if (!['admin', 'master', 'manager'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Strict Administrator access required.' });
    }
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Authentication is not configured.' });

    const user = await User.findByPk(req.params.id, { attributes: publicAttributes });
    if (!user || user.role !== 'user') return res.status(404).json({ message: 'Client account not found.' });

    // A non-master administrator may only enter a profile belonging to their
    // current tenant.  The database tenant scope also applies to this lookup.
    if (req.user.role !== 'master' && Number(user.projectId || 0) !== Number(req.user.projectId || 0)) {
      return res.status(403).json({ message: 'This client belongs to a different project.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, impersonatedBy: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    return res.json({
      token,
      // Keep the transfer URL small; AuthContext immediately refreshes the
      // complete account from /auth/me after the session is stored.
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        projectId: user.projectId,
        accountType: user.accountType,
      },
      expiresIn: 900,
    });
  } catch (error) {
    return next(error);
  }
};

function buildSummary(walletOrBalance, trades, prices = new Map()) {
  const openProfit = money(trades.reduce((sum, trade) => {
    const quote = prices.get(trade.symbol);
    return sum + profitFor(trade, quote?.price || trade.openPrice);
  }, 0));
  const balance = money(typeof walletOrBalance === 'object' && walletOrBalance !== null ? walletOrBalance.balance : walletOrBalance);
  const margin = money(trades.reduce((sum, trade) => sum + Number(trade.margin), 0));
  const equity = money(balance + openProfit);
  const freeFunds = money(equity - margin);
  const marginLevel = margin ? Number(((equity / margin) * 100).toFixed(2)) : 0;
  return { balance, equity, margin, freeFunds, marginLevel, openProfit };
}

async function updateSnapshot(wallet, summary, transaction) {
  await wallet.update({
    equity: summary.equity,
    margin: summary.margin,
    freeFunds: summary.freeFunds,
  }, { transaction });
}

async function storedSummary(userId, transaction) {
  const wallet = await Wallet.findOne({
    where: { userId },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!wallet) throw apiError('User wallet not found.', 404);
  const trades = await Trade.findAll({ where: { userId, status: 'open' }, transaction });
  const summary = buildSummary(wallet, trades);
  await updateSnapshot(wallet, summary, transaction);
  return { wallet, summary };
}

exports.birthdays = async (req, res, next) => {
  try {
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear().toString();

    // Find all users who already received the birthday bonus this year
    const claimedTransactions = await Transaction.findAll({
      where: {
        type: 'admin_add_balance',
        referenceType: 'birthday_bonus',
        description: currentYear
      },
      attributes: ['userId']
    });
    const claimedUserIds = claimedTransactions.map(tx => tx.userId);

    const users = await User.findAll({
      attributes: publicListAttributes,
      where: { role: 'user' }
    });
    
    const birthdayUsers = users.filter(user => {
      if (claimedUserIds.includes(user.id)) return false;
      if (!user.dateOfBirth) return false;
      const parts = user.dateOfBirth.split('/');
      if (parts.length >= 2) {
        const day = parseInt(parts[0].trim(), 10);
        const month = parseInt(parts[1].trim(), 10);
        return day === todayDay && month === todayMonth;
      }
      return false;
    });
    
    return res.json({ users: birthdayUsers });
  } catch (error) {
    return next(error);
  }
};

exports.users = async (req, res, next) => {
  try {
    const limit = listLimit(req.query.limit, 150);
    // Agents must only work with the clients explicitly assigned to them. A new
    // agent therefore starts with an empty client list until an admin assigns one.
    const userScope = req.user?.role === 'agent'
      ? { assignedAgentId: req.user.id, role: 'user' }
      : undefined;
    const [users, trades, livePrices, depositTotals, depositAccountTotals, adminBalanceTotals, liveAccountTotal, tradeStats] = await Promise.all([
      User.findAll({
        attributes: publicListAttributes,
        where: userScope,
        include: [
          { model: Wallet, as: 'wallet' },
          { model: TradingAccount, as: 'tradingAccounts' },
          { model: User, as: 'referrer', attributes: ['id', 'name', 'email', 'referralCode'] },
          { model: User, as: 'assignedAgent', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'assignedBy', attributes: ['id', 'name', 'role'] },
          {
            model: User,
            as: 'referrals',
            attributes: ['id', 'name', 'email', 'accountType', 'verificationStatus', 'createdAt'],
            include: [{ model: Wallet, as: 'wallet' }],
          },
        ],
        order: [
          ['createdAt', 'DESC'],
          [{ model: TradingAccount, as: 'tradingAccounts' }, 'createdAt', 'ASC'],
          [{ model: User, as: 'referrals' }, 'createdAt', 'DESC'],
        ],
        limit,
      }),
      Trade.findAll({
        where: {
          status: 'open',
          tradingAccountId: { [Op.in]: sequelize.literal("(SELECT `id` FROM `trading_accounts` WHERE `type` = 'Live')") },
        },
      }),
      tradingView.getPrices(),
      Deposit.findAll({
        attributes: [
          'userId',
          [sequelize.fn('SUM', sequelize.col('amount')), 'totalDeposits'],
          [sequelize.fn('SUM', sequelize.col('bonus')), 'totalBonus'],
        ],
        where: { status: 'approved' },
        group: ['userId'],
        raw: true,
      }),
      Deposit.findAll({
        attributes: [
          'tradingAccountId',
          [sequelize.fn('SUM', sequelize.col('amount')), 'totalDeposits'],
          [sequelize.fn('SUM', sequelize.col('bonus')), 'totalBonus'],
        ],
        where: { status: 'approved', tradingAccountId: { [Op.ne]: null } },
        group: ['tradingAccountId'],
        raw: true,
      }),
      Transaction.findAll({
        attributes: [
          'userId',
          'referenceId',
          [sequelize.fn('SUM', sequelize.col('amount')), 'totalDeposits'],
          [sequelize.fn('SUM', sequelize.col('bonus')), 'totalBonus'],
        ],
        where: { type: 'admin_add_balance', status: 'completed' },
        group: ['userId', 'referenceId'],
        raw: true,
      }),
      TradingAccount.sum('balance', { where: { type: 'Live' } }),
      Trade.findAll({
        attributes: [
          'userId',
          [sequelize.fn('SUM', sequelize.col('lots')), 'totalVolume'],
          [sequelize.fn('SUM', sequelize.col('profit')), 'totalClosedProfit'],
          [sequelize.fn('COUNT', sequelize.col('Trade.id')), 'totalTradesCount'],
        ],
        where: {
          tradingAccountId: { [Op.in]: sequelize.literal("(SELECT `id` FROM `trading_accounts` WHERE `type` = 'Live')") },
        },
        group: ['userId'],
        raw: true,
      }),
    ]);
    const byUser = new Map();
    trades.forEach((trade) => byUser.set(trade.userId, [...(byUser.get(trade.userId) || []), trade]));
    const prices = new Map(livePrices.map((item) => [item.symbol, item]));
    const totals = (deposit = 0, bonus = 0) => ({ totalDeposits: money(deposit), totalBonus: money(bonus) });
    const addTotals = (map, key, deposit = 0, bonus = 0) => {
      const current = map.get(key) || totals();
      map.set(key, totals(current.totalDeposits + Number(deposit || 0), current.totalBonus + Number(bonus || 0)));
    };
    const depositsByUser = new Map();
    const depositsByAccount = new Map();
    depositTotals.forEach((item) => addTotals(depositsByUser, Number(item.userId), item.totalDeposits, item.totalBonus));
    depositAccountTotals.forEach((item) => addTotals(depositsByAccount, Number(item.tradingAccountId), item.totalDeposits, item.totalBonus));
    adminBalanceTotals.forEach((item) => {
      const creditedTotal = Number(item.totalDeposits || 0) + Number(item.totalBonus || 0);
      addTotals(depositsByUser, Number(item.userId), creditedTotal, item.totalBonus);
      if (item.referenceId) addTotals(depositsByAccount, Number(item.referenceId), creditedTotal, item.totalBonus);
    });
    const tradeStatsByUser = new Map(
      (tradeStats || []).map((item) => [
        Number(item.userId),
        {
          totalVolume: Number(item.totalVolume || 0),
          totalClosedProfit: Number(item.totalClosedProfit || 0),
          totalTradesCount: Number(item.totalTradesCount || 0),
        },
      ])
    );
    const result = await Promise.all(users.map(async (user) => {
      const values = user.toJSON();
      const liveAccounts = (values.tradingAccounts || []).filter((account) => account.type === 'Live');
      const liveAccountIds = new Set(liveAccounts.map((account) => Number(account.id)));
      const liveBalance = liveAccounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
      const liveTrades = (byUser.get(user.id) || []).filter((trade) => 
        trade.tradingAccountId && liveAccountIds.has(Number(trade.tradingAccountId))
      );
      const summary = values.wallet
        ? { ...buildSummary(liveBalance, liveTrades, prices), openTradesCount: liveTrades.length }
        : { balance: 0, equity: 0, margin: 0, freeFunds: 0, openProfit: 0, openTradesCount: 0 };
      const referralIds = (values.referrals || []).map((referral) => referral.id);
      const [approvedDeposits, pendingDeposits] = referralIds.length
        ? await Promise.all([
          Transaction.sum('amount', {
            where: { userId: { [Op.in]: referralIds }, type: 'deposit', status: { [Op.in]: ['approved', 'completed'] } },
          }),
          Transaction.sum('amount', {
            where: { userId: { [Op.in]: referralIds }, type: 'deposit', status: 'pending' },
          }),
        ])
        : [0, 0];
      const userTradeStats = tradeStatsByUser.get(user.id) || { totalVolume: 0, totalClosedProfit: 0, totalTradesCount: 0 };
      const totalProfit = money(userTradeStats.totalClosedProfit + (summary.openProfit || 0));
      const userDepositTotals = depositsByUser.get(user.id) || totals();
      const tradingAccounts = (values.tradingAccounts || []).map((account) => ({
        ...account,
        accountStats: depositsByAccount.get(Number(account.id)) || totals(),
      }));
      return {
        ...values,
        tradingAccounts,
        wallet: values.wallet ? { ...values.wallet, ...summary } : null,
        referralStats: {
          count: referralIds.length,
          approvedDeposits: money(approvedDeposits),
          pendingDeposits: money(pendingDeposits),
        },
        accountStats: {
          totalDeposits: userDepositTotals.totalDeposits,
          totalBonus: userDepositTotals.totalBonus,
          liveBalance: money(liveBalance),
          tradingVolume: userTradeStats.totalVolume,
          totalProfit: totalProfit,
          totalTrades: userTradeStats.totalTradesCount,
        },
      };
    }));
    await Promise.all(users.map((user, index) => (
      user.wallet ? updateSnapshot(user.wallet, result[index].wallet) : Promise.resolve()
    )));
    const clients = result.filter((user) => user.role !== 'admin');
    return res.json({
      users: result,
      stats: {
        frozenAccounts: clients.filter((user) => user.tradingStatus === 'frozen').length,
        totalWalletFunds: money(liveAccountTotal),
        activeTraders: clients.filter((user) => user.tradingStatus === 'active').length,
        totalOpenPositions: trades.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      country,
      dateOfBirth,
      accountType,
      leverage,
      verificationStatus,
      adminNotes,
    } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const selectedAccountType = accountType === 'Live' ? 'Live' : 'Demo';
    const selectedLeverage = Number(leverage || DEFAULT_LEVERAGE);
    if (!clean(name) || !normalizedEmail || !String(password || '').trim()) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (phone) {
      if (!isValidPhone(phone)) return res.status(400).json({ message: 'Enter a valid phone number with country code.' });
    }
    if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (!Number.isInteger(selectedLeverage) || selectedLeverage < MIN_LEVERAGE || selectedLeverage > MAX_LEVERAGE) {
      return res.status(400).json({ message: `Leverage must be between 1:${MIN_LEVERAGE} and 1:${MAX_LEVERAGE}.` });
    }
    if (await User.findOne({ where: { email: normalizedEmail } })) return res.status(409).json({ message: 'Email already registered.' });

    let created;
    await sequelize.transaction(async (transaction) => {
      const startingBalance = selectedAccountType === 'Demo' ? DEMO_BALANCE : 0;
      created = await User.create({
        name: clean(name),
        email: normalizedEmail,
        phone: clean(phone),
        country: clean(country),
        dateOfBirth: clean(dateOfBirth),
        password: await bcrypt.hash(String(password), 12),
        role: 'user',
        accountType: selectedAccountType,
        leverage: selectedLeverage,
        tradingStatus: 'active',
        verificationStatus: ['unverified', 'pending', 'approved', 'rejected'].includes(verificationStatus) ? verificationStatus : 'unverified',
        adminNotes: clean(adminNotes),
      }, { transaction });
      await Wallet.create({ userId: created.id, balance: startingBalance, equity: startingBalance, freeFunds: startingBalance }, { transaction });
      await TradingAccount.create({
        userId: created.id,
        type: selectedAccountType,
        name: `${selectedAccountType} account 1`,
        balance: startingBalance,
        leverage: selectedLeverage,
        status: 'active',
        isPrimary: true,
      }, { transaction });
    });
    await ensureReferralCode(created);
    const user = await User.findByPk(created.id, { attributes: publicAttributes, include: [{ model: Wallet, as: 'wallet' }, { model: TradingAccount, as: 'tradingAccounts' }] });
    return res.status(201).json({ user });
  } catch (error) {
    return next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: publicAttributes });
    if (!user || user.role !== 'admin') throw apiError('Admin account not found.', 404);
    const updates = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const name = clean(req.body.name);
      if (!name) return res.status(400).json({ message: 'Name is required.' });
      updates.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      const normalizedEmail = normalizeEmail(req.body.email);
      if (!normalizedEmail) return res.status(400).json({ message: 'Email is required.' });
      if (!isValidEmail(normalizedEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
      const existing = await User.findOne({ where: { email: normalizedEmail, id: { [Op.ne]: user.id } } });
      if (existing) return res.status(409).json({ message: 'Email already registered.' });
      updates.email = normalizedEmail;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'profileImage')) {
      const profileImage = req.body.profileImage || null;
      if (profileImage && !isImageData(profileImage)) return res.status(400).json({ message: 'Profile photo must be a PNG, JPG or WEBP image.' });
      updates.profileImage = profileImage;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: 'Nothing to update.' });
    await user.update(updates);
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

exports.updateProfilePassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || user.role !== 'admin') throw apiError('Admin account not found.', 404);
    const currentPassword = String(req.body.currentPassword || '');
    const password = String(req.body.password || '');
    if (!currentPassword) return res.status(400).json({ message: 'Current password is required for verification.' });
    if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(401).json({ message: 'Current password is incorrect.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    await user.update({ password: await bcrypt.hash(password, 12) });
    const updated = await User.findByPk(user.id, { attributes: publicAttributes });
    return res.json({ user: updated });
  } catch (error) {
    return next(error);
  }
};

exports.assignAgent = async (req, res, next) => {
  try {
    const { userIds, agentId } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'No users selected.' });
    }
    const ids = [...new Set(userIds.map(Number))];
    if (ids.some((id) => !Number.isInteger(id) || id < 1)) {
      return res.status(400).json({ message: 'Invalid user selection.' });
    }
    // agentId can be null if unassigning. Assignment is separate from the
    // referrer selected by a user's registration referral code.
    const assignedAgentId = agentId === null ? null : Number(agentId);
    if (assignedAgentId !== null && (!Number.isInteger(assignedAgentId) || assignedAgentId < 1)) {
      return res.status(400).json({ message: 'Invalid agent selected.' });
    }

    await sequelize.transaction(async (transaction) => {
      if (assignedAgentId !== null) {
        const agent = await User.findOne({
          where: { id: assignedAgentId, role: { [Op.in]: ['agent', 'manager'] } },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!agent) throw apiError('Agent or manager not found.', 404);
      }

      const selectedUsers = await User.findAll({
        where: { id: { [Op.in]: ids }, role: 'user' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (selectedUsers.length !== ids.length) throw apiError('One or more selected users were not found.', 404);

      if (assignedAgentId !== null) {
        const alreadyAssigned = selectedUsers.filter((user) => user.assignedAgentId);
        if (alreadyAssigned.length) {
          const names = alreadyAssigned.slice(0, 3).map((user) => user.name).join(', ');
          throw apiError(`${names}${alreadyAssigned.length > 3 ? ' and others' : ''} already assigned. Unassign first before assigning to another agent.`, 409);
        }
      }

      await User.update({
        assignedAgentId,
        assignedById: assignedAgentId ? req.user.id : null,
        assignmentStatus: assignedAgentId ? 'assigned' : 'unassigned',
      }, {
        where: { id: { [Op.in]: ids }, role: 'user' },
        transaction,
      });
    });

    return res.json({ message: assignedAgentId ? 'Users assigned to agent successfully.' : 'Users unassigned successfully.' });
  } catch (error) {
    return next(error);
  }
};

exports.updateUserDetails = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) throw apiError('User account not found.', 404);
    if (user.role === 'admin') throw apiError('Admin accounts cannot be edited here.', 403);
    const {
      name,
      email,
      password,
      phone,
      country,
      dateOfBirth,
      accountType,
      leverage,
      verificationStatus,
      adminNotes,
    } = req.body;
    const selectedLeverage = Number(leverage || user.leverage || DEFAULT_LEVERAGE);
    const updates = {
      name: clean(name) || user.name,
      phone: clean(phone),
      country: clean(country),
      dateOfBirth: clean(dateOfBirth),
      accountType: accountType === 'Live' ? 'Live' : 'Demo',
      leverage: selectedLeverage,
      verificationStatus: ['unverified', 'pending', 'approved', 'rejected'].includes(verificationStatus) ? verificationStatus : user.verificationStatus,
      adminNotes: clean(adminNotes),
    };
    const normalizedEmail = normalizeEmail(email);
    if (!updates.name || !normalizedEmail) return res.status(400).json({ message: 'Name and email are required.' });
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (updates.phone) {
      if (!isValidPhone(updates.phone)) return res.status(400).json({ message: 'Enter a valid phone number with country code.' });
    }
    if (!Number.isInteger(selectedLeverage) || selectedLeverage < MIN_LEVERAGE || selectedLeverage > MAX_LEVERAGE) {
      return res.status(400).json({ message: `Leverage must be between 1:${MIN_LEVERAGE} and 1:${MAX_LEVERAGE}.` });
    }
    if (normalizedEmail !== user.email) {
      if (await User.findOne({ where: { email: normalizedEmail, id: { [Op.ne]: user.id } } })) return res.status(409).json({ message: 'Email already registered.' });
      updates.email = normalizedEmail;
    }
    if (String(password || '').trim()) {
      if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
      updates.password = await bcrypt.hash(String(password), 12);
    }
    await user.update(updates);
    const updated = await User.findByPk(user.id, { attributes: publicAttributes, include: [{ model: Wallet, as: 'wallet' }, { model: TradingAccount, as: 'tradingAccounts' }] });
    return res.json({ user: updated });
  } catch (error) {
    return next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(req.params.id, { transaction });
      if (!user) throw apiError('User account not found.', 404);
      if (user.id === req.user.id) throw apiError('You cannot remove your own admin account.', 403);
      if (user.role === 'admin') throw apiError('Admin accounts cannot be removed here.', 403);
      await User.update(
        { referredById: null },
        { where: { referredById: user.id }, transaction },
      );
      await User.update(
        { assignedAgentId: null, assignedById: null, assignmentStatus: 'unassigned' },
        { where: { assignedAgentId: user.id }, transaction },
      );
      await ReferralReward.destroy({ where: { referrerId: user.id }, transaction });
      await ReferralReward.destroy({ where: { refereeId: user.id }, transaction });
      await Trade.destroy({ where: { userId: user.id }, transaction });
      await Transaction.destroy({ where: { userId: user.id }, transaction });
      await Deposit.destroy({ where: { userId: user.id }, transaction });
      await Withdrawal.destroy({ where: { userId: user.id }, transaction });
      await BankAccount.destroy({ where: { userId: user.id }, transaction });
      await TradingAccount.destroy({ where: { userId: user.id }, transaction });
      await Wallet.destroy({ where: { userId: user.id }, transaction });
      await user.destroy({ transaction });
    });
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
};

exports.userWallet = async (req, res, next) => {
  try {
    const user = await getLeanUser(req.params.id);
    const wallet = await Wallet.findOne({ where: { userId: user.id } });
    if (!wallet) throw apiError('User wallet not found.', 404);
    const accountId = Number(req.query.tradingAccountId || 0);
    const account = accountId
      ? await TradingAccount.findOne({ where: { id: accountId, userId: user.id } })
      : null;
    if (accountId && !account) throw apiError('Trading account not found.', 404);
    const tradeWhere = { userId: user.id, status: 'open' };
    if (account) tradeWhere.tradingAccountId = account.id;
    const totalTradeWhere = { userId: user.id };
    if (account) totalTradeWhere.tradingAccountId = account.id;
    const depositWhere = { userId: user.id, status: 'approved' };
    if (account) depositWhere.tradingAccountId = account.id;
    const [trades, prices, deposits, withdrawals, totalTrades] = await Promise.all([
      Trade.findAll({ where: tradeWhere }),
      tradingView.getPrices(),
      Deposit.sum('amount', { where: depositWhere }),
      Withdrawal.sum('amount', { where: { userId: user.id, status: 'approved' } }),
      Trade.count({ where: totalTradeWhere }),
    ]);
    const adminDepositWhere = { userId: user.id, type: 'admin_add_balance' };
    const adminWithdrawalWhere = { userId: user.id, type: 'admin_deduct_balance' };
    if (account) {
      adminDepositWhere.referenceType = 'trading_account';
      adminDepositWhere.referenceId = account.id;
      adminWithdrawalWhere.referenceType = 'trading_account';
      adminWithdrawalWhere.referenceId = account.id;
    }
    const [adminDeposits, adminWithdrawals] = await Promise.all([
      Transaction.sum('amount', { where: adminDepositWhere }),
      Transaction.sum('amount', { where: adminWithdrawalWhere }),
    ]);
    const adminDepositBonus = await Transaction.sum('bonus', { where: adminDepositWhere });
    const balanceSource = account ? { ...wallet.toJSON(), balance: account.balance } : wallet;
    const summary = buildSummary(balanceSource, trades, new Map(prices.map((item) => [item.symbol, item])));
    if (!account || account.isPrimary) await updateSnapshot(wallet, summary);
    return res.json({
      user,
      account,
      wallet: {
        ...wallet.toJSON(),
        ...summary,
        balance: summary.balance,
        totalDeposits: money(Number(deposits || 0) + Number(adminDeposits || 0) + Number(adminDepositBonus || 0)),
        totalWithdrawals: money((account ? 0 : Number(withdrawals || 0)) + Number(adminWithdrawals || 0)),
        totalTrades,
        leverage: account?.leverage || user.leverage,
        tradingStatus: account?.status === 'disabled' ? 'frozen' : account?.status || user.tradingStatus,
        accountName: account?.name || null,
        accountType: account?.type || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.userTransactions = async (req, res, next) => {
  try {
    const user = await getLeanUser(req.params.id);
    const accountId = Number(req.query.tradingAccountId || 0);
    if (!accountId) {
      const transactions = await Transaction.findAll({ where: { userId: user.id }, order: [['createdAt', 'DESC']] });
      return res.json({ user, transactions });
    }
    const account = await TradingAccount.findOne({ where: { id: accountId, userId: user.id } });
    if (!account) throw apiError('Trading account not found.', 404);
    const [deposits, trades] = await Promise.all([
      Deposit.findAll({ where: { userId: user.id, tradingAccountId: account.id }, attributes: ['id'] }),
      Trade.findAll({ where: { userId: user.id, tradingAccountId: account.id }, attributes: ['id'] }),
    ]);
    const depositIds = deposits.map((item) => item.id);
    const tradeIds = trades.map((item) => item.id);
    const filters = [
      { referenceType: 'trading_account', referenceId: account.id },
    ];
    if (depositIds.length) filters.push({ referenceType: 'deposit', referenceId: { [Op.in]: depositIds } });
    if (tradeIds.length) filters.push({ referenceType: 'trade', referenceId: { [Op.in]: tradeIds } });
    if (account.type === 'Demo') filters.push({ type: 'reset_demo' });
    // Always include referral reward transactions for this user
    filters.push({ referenceType: 'referral_reward' });
    const transactions = await Transaction.findAll({
      where: {
        userId: user.id,
        [Op.or]: filters,
      },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ user, account, transactions });
  } catch (error) {
    return next(error);
  }
};

exports.userOverview = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: publicListAttributes,
      include: [
        { model: Wallet, as: 'wallet' },
        { model: TradingAccount, as: 'tradingAccounts' },
        { model: BankAccount, as: 'bankAccounts' },
        { model: User, as: 'referrer', attributes: ['id', 'name', 'email', 'referralCode'] },
      ],
      order: [
        [{ model: TradingAccount, as: 'tradingAccounts' }, 'createdAt', 'ASC'],
        [{ model: BankAccount, as: 'bankAccounts' }, 'createdAt', 'DESC'],
      ],
    });
    if (!user) throw apiError('User account not found.', 404);

    const [trades, deposits, withdrawals, livePrices] = await Promise.all([
      Trade.findAll({
        where: { userId: user.id },
        include: [{ model: TradingAccount, as: 'tradingAccount', where: { type: 'Live' }, required: true }],
        order: [['createdAt', 'DESC']],
        limit: 100,
      }),
      Deposit.findAll({ attributes: { exclude: ['receiptImage'] }, where: { userId: user.id }, order: [['createdAt', 'DESC']], limit: 100 }),
      Withdrawal.findAll({ where: { userId: user.id }, order: [['createdAt', 'DESC']], limit: 100 }),
      tradingView.getPrices(),
    ]);
    const prices = new Map(livePrices.map((item) => [item.symbol, item]));
    const openTrades = trades.filter((trade) => trade.status === 'open');
    const wallet = user.wallet;
    const summary = wallet
      ? buildSummary(wallet, openTrades, prices)
      : { balance: 0, equity: 0, margin: 0, freeFunds: 0, openProfit: 0 };
    if (wallet) await updateSnapshot(wallet, summary);

    return res.json({
      user,
      wallet: wallet ? { ...wallet.toJSON(), ...summary } : null,
      trades: trades.map((trade) => {
        const values = trade.toJSON();
        if (values.status !== 'open') return values;
        const quote = prices.get(values.symbol);
        const currentPrice = quote?.price || values.openPrice;
        return {
          ...values,
          currentPrice,
          profit: money(profitFor(values, currentPrice)),
        };
      }),
      deposits,
      withdrawals,
    });
  } catch (error) {
    return next(error);
  }
};

exports.userVerification = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      // Do not serialize the full user record while a master opens KYC files.
      // The two document payloads can already be large on their own.
      attributes: ['id', 'name', 'email', 'verificationStatus', 'idProofImage', 'addressProofImage'],
    });
    if (!user) throw apiError('User account not found.', 404);
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

exports.updateBalance = (type) => async (req, res, next) => {
  try {
    const amount = money(req.body.amount);
    const bonus = type === 'admin_add_balance' ? money(req.body.bonus) : 0;
    const note = String(req.body.note || '').trim();
    const tradingAccountId = Number(req.body.tradingAccountId || 0);
    if (!(amount > 0)) return res.status(400).json({ message: 'Amount must be a positive value.' });
    if (bonus < 0) return res.status(400).json({ message: 'Bonus cannot be negative.' });
    let output;
    await sequelize.transaction(async (transaction) => {
      const user = await getUser(req.params.id, transaction);
      const { wallet } = await storedSummary(user.id, transaction);
      const requestedAccount = tradingAccountId
        ? await TradingAccount.findOne({
          where: { id: tradingAccountId, userId: user.id },
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
        : null;
      if (tradingAccountId && !requestedAccount) throw apiError('Trading account not found.', 404);

      const isBirthdayBonus = req.body.referenceType === 'birthday_bonus';
      let targetAccount = null;

      if (requestedAccount) {
        targetAccount = requestedAccount;
      } else if (!isBirthdayBonus) {
        // Prefer Live primary account; fall back to any primary, then first account ever created
        const livePrimaryAccount = await TradingAccount.findOne({ where: { userId: user.id, type: 'Live', isPrimary: true }, transaction, lock: transaction.LOCK.UPDATE });
        const anyPrimaryAccount = livePrimaryAccount || await TradingAccount.findOne({ where: { userId: user.id, isPrimary: true }, transaction, lock: transaction.LOCK.UPDATE });
        const fallbackAccount = anyPrimaryAccount || await TradingAccount.findOne({ where: { userId: user.id }, order: [['createdAt', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
        targetAccount = fallbackAccount;
      }

      const before = money(targetAccount ? targetAccount.balance : wallet.balance);
      if (type === 'admin_deduct_balance' && amount > before) throw apiError('Deduct amount cannot exceed available balance.');
      const creditAmount = money(amount + (type === 'admin_add_balance' ? bonus : 0));
      const after = money(before + (type === 'admin_add_balance' ? creditAmount : -amount));

      if (targetAccount) {
        await targetAccount.update({ balance: after }, { transaction });
      }
      const walletUpdates = {};
      // Only sync wallet.balance when the targeted account is the primary live account
      // (or no specific account was requested and target is primary).
      const targetIsLivePrimary = targetAccount && targetAccount.type === 'Live' && targetAccount.isPrimary;
      if (isBirthdayBonus || !targetAccount || (!requestedAccount ? targetIsLivePrimary : requestedAccount.type === 'Live' && requestedAccount.isPrimary)) {
        walletUpdates.balance = after;
      }
      if (type === 'admin_add_balance') {
        walletUpdates.bonus = money(Number(wallet.bonus || 0) + bonus);
      }
      if (Object.keys(walletUpdates).length) {
        await wallet.update(walletUpdates, { transaction });
      }
      const { summary } = await storedSummary(user.id, transaction);
      const ledger = await Transaction.create({
        userId: user.id,
        type,
        amount,
        bonus,
        status: 'completed',
        balanceBefore: before,
        balanceAfter: after,
        note,
        referenceType: req.body.referenceType || (targetAccount ? 'trading_account' : null),
        referenceId: targetAccount?.id || null,
        description: req.body.description || (type === 'admin_add_balance' ? 'Balance added by administrator' : 'Balance deducted by administrator'),
      }, { transaction });
      output = { user, wallet: { ...wallet.toJSON(), ...summary }, transaction: ledger };
    });
    return res.json(output);
  } catch (error) {
    return next(error);
  }
};

exports.updateLeverage = async (req, res, next) => {
  try {
    const leverage = Number(String(req.body.leverage || '').replace('1:', ''));
    if (!Number.isInteger(leverage) || leverage < MIN_LEVERAGE || leverage > MAX_LEVERAGE) {
      return res.status(400).json({ message: `Leverage must be between 1:${MIN_LEVERAGE} and 1:${MAX_LEVERAGE}.` });
    }
    const user = await getUser(req.params.id);
    await user.update({ leverage });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

exports.updateTradingAccountLeverage = async (req, res, next) => {
  try {
    const leverage = Number(String(req.body.leverage || '').replace('1:', ''));
    if (!Number.isInteger(leverage) || leverage < MIN_LEVERAGE || leverage > MAX_LEVERAGE) {
      return res.status(400).json({ message: `Leverage must be between 1:${MIN_LEVERAGE} and 1:${MAX_LEVERAGE}.` });
    }
    const user = await getUser(req.params.id);
    const account = await TradingAccount.findOne({ where: { id: req.params.accountId, userId: user.id } });
    if (!account) throw apiError('Trading account not found.', 404);
    await account.update({ leverage });
    return res.json({ account });
  } catch (error) {
    return next(error);
  }
};

exports.updateTradingLevel = async (req, res, next) => {
  try {
    const tradingLevel = String(req.body.tradingLevel || '').trim();
    if (!TRADING_LEVELS.includes(tradingLevel)) {
      return res.status(400).json({ message: `Trading level must be one of: ${TRADING_LEVELS.join(', ')}.` });
    }
    const user = await getUser(req.params.id);
    await user.update({ tradingLevel });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

exports.updateTradingStatus = async (req, res, next) => {
  try {
    const tradingStatus = String(req.body.tradingStatus || '').trim();
    if (!['active', 'frozen'].includes(tradingStatus)) {
      return res.status(400).json({ message: 'Trading status must be active or frozen.' });
    }
    const user = await getUser(req.params.id);
    if (user.role === 'admin') throw apiError('Admin accounts cannot be frozen here.', 403);
    await user.update({ tradingStatus });
    await TradingAccount.update(
      { status: tradingStatus === 'frozen' ? 'disabled' : 'active' },
      { where: { userId: user.id } },
    );
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

exports.updateTradingAccountStatus = async (req, res, next) => {
  try {
    const status = String(req.body.status || '').trim();
    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ message: 'Trading account status must be active or disabled.' });
    }
    const user = await getUser(req.params.id);
    if (user.role === 'admin') throw apiError('Admin accounts cannot be frozen here.', 403);
    const account = await TradingAccount.findOne({
      where: { id: req.params.accountId, userId: user.id },
    });
    if (!account) throw apiError('Trading account not found.', 404);
    await account.update({ status });
    const activeAccounts = await TradingAccount.count({
      where: { userId: user.id, status: { [Op.ne]: 'disabled' } },
    });
    const tradingStatus = activeAccounts ? 'active' : 'frozen';
    if (user.tradingStatus !== tradingStatus) await user.update({ tradingStatus });
    return res.json({ account, user });
  } catch (error) {
    return next(error);
  }
};

// Trading accounts hold separate balances and open positions.  Only the
// master console may permanently remove one, and every client must retain at
// least one account so they can still access the platform afterwards.
exports.deleteTradingAccount = async (req, res, next) => {
  try {
    if (req.user.role !== 'master') throw apiError('Only the Master administrator can delete trading accounts.', 403);

    let output;
    await sequelize.transaction(async (transaction) => {
      const user = await getUser(req.params.id, transaction);
      const account = await TradingAccount.findOne({
        where: { id: req.params.accountId, userId: user.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!account) throw apiError('Trading account not found.', 404);

      const remainingAccounts = await TradingAccount.findAll({
        where: { userId: user.id, id: { [Op.ne]: account.id } },
        order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!remainingAccounts.length) {
        throw apiError('A client must keep at least one trading account.', 400);
      }

      // Pending/open positions cannot belong to an account that no longer
      // exists. Closed-trade and payment history is intentionally retained.
      await Trade.destroy({
        where: { userId: user.id, tradingAccountId: account.id, status: { [Op.in]: ['pending', 'open'] } },
        transaction,
      });

      const replacement = remainingAccounts[0];
      if (account.isPrimary) {
        await replacement.update({ isPrimary: true }, { transaction });
        const wallet = await Wallet.findOne({ where: { userId: user.id }, transaction, lock: transaction.LOCK.UPDATE });
        if (wallet) {
          const replacementBalance = money(replacement.balance);
          await wallet.update({
            balance: replacementBalance,
            equity: replacementBalance,
            margin: 0,
            freeFunds: replacementBalance,
          }, { transaction });
        }
        await user.update({ accountType: replacement.type }, { transaction });
      }

      await account.destroy({ transaction });
      output = { deletedAccountId: account.id, userId: user.id };
    });
    return res.json(output);
  } catch (error) {
    return next(error);
  }
};

exports.updateNotes = async (req, res, next) => {
  try {
    const adminNotes = String(req.body.adminNotes || '').trim();
    if (adminNotes.length > 5000) return res.status(400).json({ message: 'Admin notes cannot exceed 5000 characters.' });
    const user = await getUser(req.params.id);
    await user.update({ adminNotes: adminNotes || null });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

exports.reviewVerification = (verificationStatus) => async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user.idProofImage || !user.addressProofImage) {
      throw apiError('User has not uploaded both verification documents.', 400);
    }
    await user.update({
      verificationStatus,
      verificationReviewedAt: new Date(),
      verificationReviewedBy: req.user.id,
    });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

exports.uploadVerificationDocuments = async (req, res, next) => {
  try {
    const { idProofImage, addressProofImage } = req.body;
    if (!isImageData(idProofImage) || !isImageData(addressProofImage)) {
      throw apiError('Upload both an ID proof and an address proof image.', 400);
    }
    const user = await getUser(req.params.id);
    if (user.role === 'master') throw apiError('Master accounts do not require verification.', 400);
    await user.update({ idProofImage, addressProofImage, verificationStatus: 'pending', verificationReviewedAt: null, verificationReviewedBy: null });
    return res.json({ user, message: 'Verification documents uploaded and submitted for review.' });
  } catch (error) { return next(error); }
};

exports.resetDemo = async (req, res, next) => {
  try {
    let output;
    await sequelize.transaction(async (transaction) => {
      const user = await getUser(req.params.id, transaction);
      if (user.accountType !== 'Demo') throw apiError('Only demo accounts can be reset.');
      const wallet = await Wallet.findOne({ where: { userId: user.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!wallet) throw apiError('User wallet not found.', 404);
      const before = money(wallet.balance);
      await Trade.destroy({ where: { userId: user.id, status: 'open' }, transaction });
      await wallet.update({ balance: DEMO_BALANCE, equity: DEMO_BALANCE, margin: 0, freeFunds: DEMO_BALANCE }, { transaction });
      await TradingAccount.update(
        { balance: DEMO_BALANCE },
        { where: { userId: user.id, type: 'Demo' }, transaction },
      );
      const ledger = await Transaction.create({
        userId: user.id,
        type: 'reset_demo',
        amount: DEMO_RESET_DEPOSIT,
        status: 'completed',
        balanceBefore: before,
        balanceAfter: DEMO_BALANCE,
        note: String(req.body.note || 'Demo account reset by administrator.').trim(),
        description: 'Demo balance reset',
      }, { transaction });
      output = { user, wallet, transaction: ledger };
    });
    return res.json(output);
  } catch (error) {
    return next(error);
  }
};

exports.resetLiveAccount = async (req, res, next) => {
  try {
    let output;
    await sequelize.transaction(async (transaction) => {
      const user = await getUser(req.params.id, transaction);
      const account = await TradingAccount.findOne({
        where: { id: req.params.accountId, userId: user.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!account) throw apiError('Trading account not found.', 404);
      if (account.type !== 'Live') throw apiError('Only live accounts can be reset here.', 400);

      const before = money(account.balance);
      await account.update({ balance: 0 }, { transaction });

      const wallet = await Wallet.findOne({ where: { userId: user.id }, transaction, lock: transaction.LOCK.UPDATE });
      const resetDepositWhere = {
        userId: user.id,
        status: 'approved',
        [Op.or]: [
          { tradingAccountId: account.id },
          ...(account.isPrimary ? [{ tradingAccountId: null }] : []),
        ],
      };
      const resetDeposits = await Deposit.findAll({
        where: resetDepositWhere,
        attributes: ['id'],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const resetDepositIds = resetDeposits.map((deposit) => deposit.id);
      await Deposit.update({ amount: 0, bonus: 0 }, { where: resetDepositWhere, transaction });
      if (resetDepositIds.length) {
        await Transaction.update(
          { amount: 0, bonus: 0 },
          {
            where: {
              referenceType: 'deposit',
              referenceId: { [Op.in]: resetDepositIds },
            },
            transaction,
          }
        );
      }
      await Transaction.update(
        { amount: 0, bonus: 0 },
        {
          where: {
            userId: user.id,
            type: 'admin_add_balance',
            referenceType: 'trading_account',
            referenceId: account.id,
          },
          transaction,
        }
      );
      if (account.isPrimary) {
        if (wallet) await wallet.update({ balance: 0, equity: 0, margin: 0, freeFunds: 0, bonus: 0 }, { transaction });
      } else if (wallet) {
        await wallet.update({ bonus: 0 }, { transaction });
      }

      const ledger = await Transaction.create({
        userId: user.id,
        type: 'admin_deduct_balance',
        amount: before,
        status: 'completed',
        balanceBefore: before,
        balanceAfter: 0,
        note: String(req.body.note || 'Live account reset by administrator.').trim(),
        referenceType: 'trading_account',
        referenceId: account.id,
        description: 'Live account balance reset',
      }, { transaction });
      output = { user, account, transaction: ledger };
    });
    return res.json(output);
  } catch (error) {
    return next(error);
  }
};

exports.deposits = async (req, res, next) => {
  try {
    const limit = listLimit(req.query.limit);
    const userWhere = req.user?.role === 'agent' ? { assignedAgentId: req.user.id } : undefined;
    const { rows, count } = await Deposit.findAndCountAll({
      attributes: { exclude: ['receiptImage'] },
      include: [{ model: User, attributes: leanUserAttributes, where: userWhere }],
      where: {
        paymentMethod: { [Op.notIn]: ['Admin Adjustment'] }
      },
      order: [['createdAt', 'DESC']],
      limit,
    });
    const adminDeposits = await Transaction.findAll({
      where: { type: 'admin_add_balance' },
      include: [{ model: User, attributes: leanUserAttributes, where: userWhere }],
      order: [['createdAt', 'DESC']],
      limit,
    });
    const deposits = [
      ...rows.map((item) => item.toJSON()),
      ...adminDeposits.map((item) => ({
        id: `admin-transaction-${item.id}`,
        userId: item.userId,
        amount: item.amount,
        bonus: item.bonus,
        currency: 'USD',
        paymentMethod: 'Admin Deposit',
        referenceNumber: `TXN #${item.id}`,
        note: item.note || item.description,
        status: 'approved',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        reviewedAt: item.createdAt,
        User: item.User,
        isAdminBalance: true,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);
    return res.json({ deposits, total: count + adminDeposits.length });
  } catch (error) {
    return next(error);
  }
};

exports.depositMethodAddresses = async (req, res, next) => {
  try {
    const { where } = await depositAddressScopeFor(req);
    const addresses = await DepositMethodAddress.findAll({
      where,
      order: [['paymentMethod', 'ASC'], ['createdAt', 'DESC']],
      skipProjectId: true,
    });
    return res.json({ addresses });
  } catch (error) {
    return next(error);
  }
};

exports.createDepositMethodAddress = async (req, res, next) => {
  try {
    const { projectId } = await depositAddressScopeFor(req);
    const paymentMethod = String(req.body.paymentMethod || '').trim();
    const address = String(req.body.address || '').trim();
    if (!paymentMethod || !address) throw apiError('Payment method and address are required.', 400);
    const record = await DepositMethodAddress.create({
      paymentMethod,
      address,
      label: clean(req.body.label),
      qrData: clean(req.body.qrData),
      isActive: req.body.isActive !== false,
      projectId,
    });
    return res.status(201).json({ address: record });
  } catch (error) {
    return next(error);
  }
};

exports.updateDepositMethodAddress = async (req, res, next) => {
  try {
    const { projectId, where } = await depositAddressScopeFor(req);
    const record = await DepositMethodAddress.findOne({
      where: { id: req.params.id, ...where },
      skipProjectId: true,
    });
    if (!record) throw apiError('Deposit method address not found.', 404);
    const paymentMethod = String(req.body.paymentMethod || record.paymentMethod || '').trim();
    const address = String(req.body.address || record.address || '').trim();
    if (!paymentMethod || !address) throw apiError('Payment method and address are required.', 400);
    await record.update({
      paymentMethod,
      address,
      label: clean(req.body.label),
      qrData: clean(req.body.qrData),
      isActive: req.body.isActive !== false,
      // Editing a legacy global address adopts it into this company.
      projectId,
    });
    return res.json({ address: record });
  } catch (error) {
    return next(error);
  }
};

exports.deleteDepositMethodAddress = async (req, res, next) => {
  try {
    const { where } = await depositAddressScopeFor(req);
    const record = await DepositMethodAddress.findOne({
      where: { id: req.params.id, ...where },
      skipProjectId: true,
    });
    if (!record) throw apiError('Deposit method address not found.', 404);
    await record.destroy();
    return res.json({ message: 'Deposit method address removed.' });
  } catch (error) {
    return next(error);
  }
};

exports.depositDetails = async (req, res, next) => {
  try {
    const deposit = await Deposit.findByPk(req.params.id, {
      include: [{ model: User, attributes: publicListAttributes }],
    });
    if (!deposit) throw apiError('Deposit request not found.', 404);
    return res.json({ deposit });
  } catch (error) {
    return next(error);
  }
};

exports.updateDeposit = async (req, res, next) => {
  try {
    const deposit = await Deposit.findByPk(req.params.id, {
      include: [{ model: User, attributes: publicListAttributes }],
    });
    if (!deposit) throw apiError('Deposit request not found.', 404);
    if (deposit.status !== 'pending') throw apiError('Only pending deposits can be edited.', 400);
    const amount = Number(req.body.amount);
    const bonus = Number(req.body.bonus || 0);
    const currency = String(req.body.currency || deposit.currency || 'USD').trim().toUpperCase();
    const paymentMethod = String(req.body.paymentMethod || '').trim();
    if (!(amount > 0)) return res.status(400).json({ message: 'Deposit amount must be greater than zero.' });
    if (bonus < 0) return res.status(400).json({ message: 'Bonus cannot be negative.' });
    if (!currency || currency.length > 8) return res.status(400).json({ message: 'Enter a valid currency.' });
    if (!paymentMethod) return res.status(400).json({ message: 'Payment method is required.' });

    await sequelize.transaction(async (transaction) => {
      await deposit.update({
        amount: money(amount),
        bonus: money(bonus),
        currency,
        paymentMethod,
        referenceNumber: clean(req.body.referenceNumber),
        depositAddressLabel: clean(req.body.depositAddressLabel),
        depositAddress: clean(req.body.depositAddress),
        note: clean(req.body.note),
      }, { transaction });
      await Transaction.update({
        amount: money(amount),
        bonus: money(bonus),
        note: clean(req.body.note),
        description: `Deposit via ${paymentMethod}`,
      }, {
        where: { referenceType: 'deposit', referenceId: deposit.id, status: 'pending' },
        transaction,
      });
    });
    const updated = await Deposit.findByPk(deposit.id, {
      include: [{ model: User, attributes: publicListAttributes }],
    });
    return res.json({ deposit: updated });
  } catch (error) {
    return next(error);
  }
};

exports.withdrawals = async (req, res, next) => {
  try {
    const limit = listLimit(req.query.limit);
    const userWhere = req.user?.role === 'agent' ? { assignedAgentId: req.user.id } : undefined;
    const { rows, count } = await Withdrawal.findAndCountAll({
      include: [{ model: User, attributes: leanUserAttributes, where: userWhere }],
      order: [['createdAt', 'DESC']],
      limit,
    });
    const adminWithdrawals = await Transaction.findAll({
      where: { type: 'admin_deduct_balance' },
      include: [{ model: User, attributes: leanUserAttributes, where: userWhere }],
      order: [['createdAt', 'DESC']],
      limit,
    });
    const withdrawals = [
      ...rows.map((item) => item.toJSON()),
      ...adminWithdrawals.map((item) => ({
        id: `admin-transaction-${item.id}`,
        userId: item.userId,
        amount: item.amount,
        withdrawalMethod: 'Admin',
        bankName: 'Admin Withdrawal',
        accountNumber: `TXN #${item.id}`,
        accountHolderName: item.User?.name || item.User?.email || 'User',
        note: item.note || item.description,
        status: 'approved',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        reviewedAt: item.createdAt,
        User: item.User,
        isAdminBalance: true,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);
    return res.json({ withdrawals, total: count + adminWithdrawals.length });
  } catch (error) {
    return next(error);
  }
};

exports.trades = async (req, res, next) => {
  try {
    const userWhere = req.user?.role === 'agent' ? { assignedAgentId: req.user.id } : undefined;
    const { rows, count } = await Trade.findAndCountAll({
      where: {
        tradingAccountId: { [Op.in]: sequelize.literal("(SELECT `id` FROM `trading_accounts` WHERE `type` = 'Live')") },
      },
      include: [
        { model: User, attributes: leanUserAttributes, where: userWhere },
      ],
      order: [['createdAt', 'DESC']],
      limit: listLimit(req.query.limit),
    });
    return res.json({ trades: rows, total: count });
  } catch (error) {
    return next(error);
  }
};

exports.bankAccounts = async (req, res, next) => {
  try {
    const userWhere = req.user?.role === 'agent' ? { assignedAgentId: req.user.id } : undefined;
    const { rows, count } = await BankAccount.findAndCountAll({
      include: [{ model: User, attributes: leanUserAttributes, where: userWhere }],
      order: [['createdAt', 'DESC']],
      limit: listLimit(req.query.limit),
    });
    return res.json({ accounts: rows, total: count });
  } catch (error) {
    return next(error);
  }
};

exports.updateWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await Withdrawal.findByPk(req.params.id, {
      include: [{ model: User, attributes: leanUserAttributes }],
    });
    if (!withdrawal) throw apiError('Withdrawal request not found.', 404);
    if (withdrawal.status !== 'pending') throw apiError('Only pending withdrawals can be edited.', 400);
    const amount = Number(req.body.amount);
    const withdrawalMethod = req.body.withdrawalMethod === 'Crypto' ? 'Crypto' : 'Bank';
    const bankName = String(req.body.bankName || '').trim();
    const accountNumber = String(req.body.accountNumber || '').trim();
    const accountHolderName = String(req.body.accountHolderName || '').trim();
    if (!(amount > 0)) return res.status(400).json({ message: 'Withdrawal amount must be greater than zero.' });
    if (!bankName || !accountNumber || !accountHolderName) {
      return res.status(400).json({ message: 'Account holder, bank name and account number are required.' });
    }
    await sequelize.transaction(async (transaction) => {
      await withdrawal.update({
        amount: money(amount),
        withdrawalMethod,
        bankName,
        accountNumber,
        accountHolderName,
      }, { transaction });
      await Transaction.update({
        amount: money(amount),
        description: withdrawalMethod === 'Bank' ? `Withdrawal to ${bankName}` : `Crypto withdrawal to ${bankName}`,
      }, {
        where: { referenceType: 'withdrawal', referenceId: withdrawal.id, status: 'pending' },
        transaction,
      });
    });
    const updated = await Withdrawal.findByPk(withdrawal.id, {
      include: [{ model: User, attributes: leanUserAttributes }],
    });
    return res.json({ withdrawal: updated });
  } catch (error) {
    return next(error);
  }
};

exports.reviewBankAccount = (status) => async (req, res, next) => {
  try {
    const account = await BankAccount.findByPk(req.params.id);
    if (!account) throw apiError('Bank account details not found.', 404);
    if (account.status === 'delete_pending' && status === 'approved') {
      await User.update({
        bankAccountHolder: null,
        bankName: null,
        bankBranch: null,
        bankAccountNumber: null,
      }, { where: { id: account.userId } });
      await account.destroy();
      return res.json({ deleted: true });
    }
    if (account.status === 'delete_pending' && status === 'rejected') {
      await account.update({
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      });
      return res.json({ account });
    }
    await account.update({
      status,
      reviewedAt: new Date(),
      reviewedBy: req.user.id,
    });
    return res.json({ account });
  } catch (error) {
    return next(error);
  }
};

exports.reviewDeposit = (status) => async (req, res, next) => {
  try {
    let result;
    await sequelize.transaction(async (transaction) => {
      const deposit = await Deposit.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!deposit || deposit.status !== 'pending') throw apiError('Pending deposit not found.', 404);
      if (status === 'approved') {
        const hasBody = Object.keys(req.body || {}).length > 0;
        let amount = hasBody ? Number(req.body.amount || deposit.amount) : Number(deposit.amount);
        let bonus = hasBody ? Number(req.body.bonus || 0) : Number(deposit.bonus || 0);
        let currency = hasBody ? String(req.body.currency || deposit.currency || 'USD').trim().toUpperCase() : String(deposit.currency || 'USD').trim().toUpperCase();
        let paymentMethod = hasBody ? String(req.body.paymentMethod || deposit.paymentMethod || '').trim() : String(deposit.paymentMethod || '').trim();
        let referenceNumber = hasBody ? clean(req.body.referenceNumber) : deposit.referenceNumber;
        let depositAddressLabel = hasBody ? clean(req.body.depositAddressLabel) : deposit.depositAddressLabel;
        let depositAddress = hasBody ? clean(req.body.depositAddress) : deposit.depositAddress;
        let note = hasBody ? clean(req.body.note) : deposit.note;

        if (currency === 'INR') {
          amount = amount / 100;
          currency = 'USD';
        }

        if (!(amount > 0)) throw apiError('Deposit amount must be greater than zero.', 400);
        if (bonus < 0) throw apiError('Bonus cannot be negative.', 400);
        if (!currency || currency.length > 8) throw apiError('Enter a valid currency.', 400);
        if (!paymentMethod) throw apiError('Payment method is required.', 400);

        await deposit.update({
          amount: money(amount),
          bonus: money(bonus),
          currency,
          paymentMethod,
          referenceNumber,
          depositAddressLabel,
          depositAddress,
          note,
        }, { transaction });
        
        await Transaction.update({
          amount: money(amount),
          bonus: money(bonus),
          note,
          description: `Deposit via ${paymentMethod}`,
        }, {
          where: { referenceType: 'deposit', referenceId: deposit.id, status: 'pending' },
          transaction,
        });
      }
      await deposit.update({ status, reviewedAt: new Date(), reviewedBy: req.user.id }, { transaction });
      let before;
      let after;
      if (status === 'approved') {
        const bonus = money(deposit.bonus);
        let liveAccount = deposit.tradingAccountId
          ? await TradingAccount.findOne({
              where: { id: deposit.tradingAccountId, userId: deposit.userId, type: 'Live' },
              transaction,
              lock: transaction.LOCK.UPDATE,
            })
          : null;
        if (!liveAccount) {
          liveAccount = await TradingAccount.findOne({
            where: { userId: deposit.userId, type: 'Live' },
            order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
        }
        if (!liveAccount) {
          // De-select any other primary accounts first
          await TradingAccount.update(
            { isPrimary: false },
            { where: { userId: deposit.userId }, transaction }
          );
          
          const existingCount = await TradingAccount.count({ where: { userId: deposit.userId, type: 'Live' }, transaction });
          const user = await User.findByPk(deposit.userId, { transaction });
          
          liveAccount = await TradingAccount.create({
            userId: deposit.userId,
            type: 'Live',
            name: `Live account ${existingCount + 1}`,
            balance: 0.00,
            leverage: user?.leverage || DEFAULT_LEVERAGE,
            status: 'active',
            isPrimary: true,
          }, { transaction });

          if (user) {
            await user.update({ accountType: 'Live' }, { transaction });
          }
        }
        const { wallet } = await storedSummary(deposit.userId, transaction);
        before = money(wallet.balance);
        const creditAmount = money(Number(deposit.amount) + bonus);
        after = money(before + creditAmount);
        await wallet.update({ balance: after, bonus: money(Number(wallet.bonus || 0) + bonus) }, { transaction });
        if (liveAccount) await liveAccount.update({ balance: money(Number(liveAccount.balance) + creditAmount) }, { transaction });
        
        // Create a pending referral reward if it doesn't already exist and the depositor was referred by someone
        const depositor = await User.findByPk(deposit.userId, { transaction });
        if (depositor && depositor.referredById) {
          const existingReward = await ReferralReward.findOne({ where: { depositId: deposit.id }, transaction });
          if (!existingReward) {
            const rewardAmount = money(Number(deposit.amount) * 0.10);
            if (rewardAmount > 0) {
              await ReferralReward.create({
                projectId: deposit.projectId,
                referrerId: depositor.referredById,
                refereeId: deposit.userId,
                depositId: deposit.id,
                amount: rewardAmount,
                status: 'pending',
              }, { transaction });
            }
          }
        }

        await storedSummary(deposit.userId, transaction);
      }
      const [updatedTransactions] = await Transaction.update({ status: status === 'approved' ? 'completed' : 'rejected', balanceBefore: before, balanceAfter: after }, {
        where: { referenceType: 'deposit', referenceId: deposit.id },
        transaction,
      });
      if (!updatedTransactions) {
        await Transaction.create({
          userId: deposit.userId,
          type: 'deposit',
          amount: deposit.amount,
          bonus: deposit.bonus,
          status: status === 'approved' ? 'completed' : 'rejected',
          balanceBefore: before,
          balanceAfter: after,
          note: deposit.note,
          referenceType: 'deposit',
          referenceId: deposit.id,
          description: `Deposit via ${deposit.paymentMethod}`,
        }, { transaction });
      }
      if (status === 'rejected') {
        await ReferralReward.update(
          { status: 'rejected', reviewedAt: new Date(), reviewedBy: req.user.id },
          { where: { depositId: deposit.id, status: 'pending' }, transaction }
        );
      }
      result = deposit;
    });
    return res.json({ deposit: result });
  } catch (error) {
    return next(error);
  }
};

exports.reviewWithdrawal = (status) => async (req, res, next) => {
  try {
    let result;
    await sequelize.transaction(async (transaction) => {
      const withdrawal = await Withdrawal.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!withdrawal || withdrawal.status !== 'pending') throw apiError('Pending withdrawal not found.', 404);
      await withdrawal.update({ status, reviewedAt: new Date(), reviewedBy: req.user.id }, { transaction });
      let before;
      let after;
      if (status === 'approved') {
        const { wallet } = await storedSummary(withdrawal.userId, transaction);
        const liveAccount = await TradingAccount.findOne({
          where: { userId: withdrawal.userId, type: 'Live' },
          order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        before = money(wallet.balance);
        if (Number(withdrawal.amount) > before) throw apiError('User wallet does not have sufficient balance.');
        after = money(before - Number(withdrawal.amount));
        await wallet.update({ balance: after }, { transaction });
        if (liveAccount) {
          const liveBefore = money(liveAccount.balance);
          if (Number(withdrawal.amount) > liveBefore) throw apiError('Live trading account does not have sufficient balance.');
          await liveAccount.update({ balance: money(liveBefore - Number(withdrawal.amount)) }, { transaction });
        }
        await storedSummary(withdrawal.userId, transaction);
      }
      await Transaction.update({ status: status === 'approved' ? 'completed' : 'rejected', balanceBefore: before, balanceAfter: after }, {
        where: { referenceType: 'withdrawal', referenceId: withdrawal.id },
        transaction,
      });
      result = withdrawal;
    });
    return res.json({ withdrawal: result });
  } catch (error) {
    return next(error);
  }
};

async function getHistoricalPriceHelper(symbol, date) {
  try {
    const timestamp = Math.floor(new Date(date).getTime() / 1000);
    if (!Number.isFinite(timestamp)) return null;

    // NovaFXM is the primary candle store. Resolve the selected minute from
    // one-minute candles and only use a nearby local row when that minute is absent.
    const candles = await tradingView.getHistoricalCandles(symbol, '1m', 60, { before: timestamp + 1 });
    const minuteCandle = [...candles]
      .filter((candle) => Number(candle?.time) <= timestamp)
      .sort((a, b) => Number(b.time) - Number(a.time))[0];
    if (minuteCandle && Number.isFinite(Number(minuteCandle.close))) return Number(minuteCandle.close);

    const [before, after] = await Promise.all([
      Candle.findOne({ where: { symbol, timeframe: '1m', time: { [Op.lte]: timestamp } }, order: [['time', 'DESC']] }),
      Candle.findOne({ where: { symbol, timeframe: '1m', time: { [Op.gte]: timestamp } }, order: [['time', 'ASC']] }),
    ]);
    const candle = !before ? after : !after ? before
      : timestamp - Number(before.time) <= Number(after.time) - timestamp ? before : after;
    return candle ? Number(candle.close) : null;
  } catch (err) {
    console.error('Error fetching historical price:', err.message);
    return null;
  }
}

exports.getHistoricalPrice = async (req, res, next) => {
  try {
    const { symbol, date } = req.query;
    if (!symbol || !date) {
      return res.status(400).json({ message: 'Symbol and date are required.' });
    }
    const price = await getHistoricalPriceHelper(symbol, date);
    return res.json({ price });
  } catch (error) {
    return next(error);
  }
};

exports.addCustomTrade = async (req, res, next) => {
  try {
    const { userId, tradingAccountId, symbol, side, lots, status, openPrice, closePrice, profit, createdAt, closedAt, stopLoss, takeProfit } = req.body;

    if (!userId || !tradingAccountId || !symbol || !side || !lots || !status) {
      return res.status(400).json({ message: 'User, account, symbol, side, lots, and status are required.' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const tradingAccount = await TradingAccount.findOne({ where: { id: tradingAccountId, userId } });
    if (!tradingAccount) return res.status(404).json({ message: 'Trading account not found for this user.' });

    if (createdAt && isNaN(new Date(createdAt).getTime())) {
      return res.status(400).json({ message: 'Invalid open date format.' });
    }
    if (status === 'closed' && closedAt && isNaN(new Date(closedAt).getTime())) {
      return res.status(400).json({ message: 'Invalid close date format.' });
    }

    const openDate = createdAt ? new Date(createdAt) : new Date();
    const closeDate = (status === 'closed') ? (closedAt ? new Date(closedAt) : new Date()) : null;

    let resolvedOpenPrice = Number(openPrice);
    if (!resolvedOpenPrice || isNaN(resolvedOpenPrice)) {
      resolvedOpenPrice = await getHistoricalPriceHelper(symbol, openDate);
      if (!resolvedOpenPrice) {
        const market = await tradingView.getPrice(symbol).catch(() => null);
        resolvedOpenPrice = market ? (side === 'BUY' ? market.ask : market.bid) : null;
      }
    }
    if (!resolvedOpenPrice || isNaN(resolvedOpenPrice)) {
      return res.status(400).json({ message: 'Open price could not be determined. Please specify it manually.' });
    }

    let resolvedClosePrice = null;
    if (status === 'closed') {
      resolvedClosePrice = Number(closePrice);
      if (!resolvedClosePrice || isNaN(resolvedClosePrice)) {
        resolvedClosePrice = await getHistoricalPriceHelper(symbol, closeDate);
        if (!resolvedClosePrice) {
          const market = await tradingView.getPrice(symbol).catch(() => null);
          resolvedClosePrice = market ? (side === 'BUY' ? market.bid : market.ask) : null;
        }
      }
      if (!resolvedClosePrice || isNaN(resolvedClosePrice)) {
        return res.status(400).json({ message: 'Close price could not be determined. Please specify it manually.' });
      }
    }

    const contractSize = (sym) => {
      const normalized = String(sym).toUpperCase();
      if (normalized.includes('BTC') || normalized.includes('ETH') || normalized === 'US500') return 1;
      if (normalized.includes('XAU') || normalized.includes('OIL')) return 100;
      return 100000;
    };

    let calculatedProfit = 0;
    if (status === 'closed') {
      if (profit !== undefined && profit !== null && profit !== '') {
        calculatedProfit = Number(profit);
      } else {
        calculatedProfit = (resolvedClosePrice - resolvedOpenPrice) * (side === 'BUY' ? 1 : -1) * Number(lots) * contractSize(symbol);
        calculatedProfit = Number(calculatedProfit.toFixed(2));
      }
    }

    const leverage = tradingAccount.leverage || user.leverage || 500;
    const margin = (Number(lots) * contractSize(symbol) * resolvedOpenPrice) / Math.max(1, leverage);
    const finalMargin = Number(margin.toFixed(2));

    let createdTrade;
    await sequelize.transaction(async (transaction) => {
      const wallet = await Wallet.findOne({ where: { userId }, transaction, lock: transaction.LOCK.UPDATE });
      const account = await TradingAccount.findOne({ where: { id: tradingAccountId, userId }, transaction, lock: transaction.LOCK.UPDATE });

      createdTrade = await Trade.create({
        userId,
        tradingAccountId,
        symbol,
        side,
        lots,
        orderType: 'market',
        entryPrice: resolvedOpenPrice,
        openPrice: resolvedOpenPrice,
        stopLoss: stopLoss ? Number(stopLoss) : null,
        takeProfit: takeProfit ? Number(takeProfit) : null,
        closePrice: resolvedClosePrice,
        profit: status === 'closed' ? calculatedProfit : 0,
        margin: finalMargin,
        status,
        createdAt: openDate,
        closedAt: closeDate,
      }, { transaction });

      if (status === 'closed') {
        const beforeBalance = Number(account.balance);
        const afterBalance = Number((beforeBalance + calculatedProfit).toFixed(2));
        await account.update({ balance: afterBalance }, { transaction });

        if (account.isPrimary) {
          const beforeWalletBalance = Number(wallet.balance);
          const afterWalletBalance = Number((beforeWalletBalance + calculatedProfit).toFixed(2));
          await wallet.update({ balance: afterWalletBalance }, { transaction });
        }

        await Transaction.create({
          userId,
          type: calculatedProfit >= 0 ? 'trade_profit' : 'trade_loss',
          amount: Math.abs(calculatedProfit),
          status: 'completed',
          balanceBefore: beforeBalance,
          balanceAfter: afterBalance,
          note: `Admin added custom trade: ${side} ${symbol} (Closed)`,
          referenceType: 'trade',
          referenceId: createdTrade.id,
          description: `Admin placed custom trade: ${side} ${symbol}`,
        }, { transaction });

      } else {
        if (account.isPrimary) {
          const openTrades = await Trade.findAll({
            where: { userId, tradingAccountId, status: 'open' },
            transaction,
          });
          const totalMargin = openTrades.reduce((sum, t) => sum + Number(t.margin), 0);
          const nextMargin = Number(totalMargin.toFixed(2));
          await wallet.update({
            margin: nextMargin,
            freeFunds: Number((Number(wallet.equity) - nextMargin).toFixed(2)),
          }, { transaction });
        }
      }

      await storedSummary(userId, transaction);
    });

    return res.status(201).json({ trade: createdTrade });
  } catch (error) {
    return next(error);
  }
};

exports.getSymbols = async (req, res, next) => {
  try {
    const project = req.projectId ? await Project.findByPk(req.projectId) : null;
    const visibilityMap = project?.symbolVisibility && typeof project.symbolVisibility === 'object'
      ? project.symbolVisibility
      : {};
    const list = tradingView.instruments.map((inst) => ({
      symbol: inst.symbol,
      group: inst.group,
      description: inst.description,
      visible: visibilityMap[inst.symbol] !== false,
    }));
    return res.json({ symbols: list });
  } catch (error) {
    return next(error);
  }
};

exports.updateSymbols = async (req, res, next) => {
  try {
    const { visibilities } = req.body;
    if (!Array.isArray(visibilities)) {
      return res.status(400).json({ message: 'Visibilities array is required.' });
    }
    if (!req.projectId) return res.status(400).json({ message: 'A company must be selected before updating symbols.' });
    const project = await Project.findByPk(req.projectId);
    if (!project) return res.status(404).json({ message: 'Company not found.' });
    const validSymbols = new Set(tradingView.instruments.map((instrument) => instrument.symbol));
    const symbolVisibility = {};
    visibilities.forEach((item) => {
      if (validSymbols.has(item?.symbol)) symbolVisibility[item.symbol] = Boolean(item.visible);
    });
    await project.update({ symbolVisibility });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

exports.agents = async (req, res, next) => {
  try {
    const agents = await User.findAll({
      where: { role: { [Op.in]: ['agent', 'manager'] } },
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ agents });
  } catch (error) {
    return next(error);
  }
};

const companyPermissionIds = async (req) => {
  if (!req.projectId) return STAFF_PERMISSIONS;
  const project = await Project.findByPk(req.projectId);
  if (!project || !Array.isArray(project.permissions) || project.permissions.length === 0) {
    return STAFF_PERMISSIONS;
  }
  return project.permissions.filter((permission) => STAFF_PERMISSIONS.includes(permission));
};

exports.companyPermissions = async (req, res, next) => {
  try {
    return res.json({ permissions: await companyPermissionIds(req) });
  } catch (error) {
    return next(error);
  }
};

exports.createAgent = async (req, res, next) => {
  try {
    const { name, email, phone, password, permissions, role } = req.body;
    const finalPassword = String(password || '');
    if (!name || !email || !finalPassword || finalPassword.length < 8) {
      return res.status(400).json({ message: 'Name, email, and password of at least 8 characters are required.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    const finalRole = role === 'manager' ? 'manager' : 'agent';
    const allowedPermissions = new Set(await companyPermissionIds(req));
    const finalPermissions = Array.isArray(permissions)
      ? permissions.filter((permission) => STAFF_PERMISSIONS.includes(permission) && allowedPermissions.has(permission))
      : [];
    
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      if (existingUser.role === 'user') {
        // Promote existing user to agent/manager
        existingUser.role = finalRole;
        existingUser.permissions = finalPermissions;
        if (name) existingUser.name = name.trim();
        if (phone) existingUser.phone = phone;
        existingUser.password = await bcrypt.hash(finalPassword, 12);
        await existingUser.save();
        await ensureStaffClientAccounts(existingUser);
        
        const publicAgent = existingUser.toJSON();
        delete publicAgent.password;
        return res.status(201).json({ agent: publicAgent });
      }
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const agent = await sequelize.transaction(async (transaction) => {
      const created = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone || null,
        password: await bcrypt.hash(finalPassword, 12),
        role: finalRole,
        permissions: finalPermissions,
        accountType: 'Demo',
        leverage: DEFAULT_LEVERAGE,
        tradingStatus: 'active',
        projectId: req.projectId || null,
      }, { transaction });
      await ensureStaffClientAccounts(created, transaction);
      return created;
    });
    const publicAgent = agent.toJSON();
    delete publicAgent.password;
    return res.status(201).json({ agent: publicAgent });
  } catch (error) {
    return next(error);
  }
};

exports.updateAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, permissions, role } = req.body;
    const agent = await User.findOne({ where: { id, role: { [Op.in]: ['agent', 'manager'] } } });
    if (!agent) return res.status(404).json({ message: 'Agent/Manager not found.' });

    if (name) agent.name = name.trim();
    if (phone !== undefined) agent.phone = phone;
    if (password) {
      const finalPassword = String(password);
      if (finalPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters.' });
      }
      agent.password = await bcrypt.hash(finalPassword, 12);
    }
    
    if (role === 'manager' || role === 'agent') {
      agent.role = role;
    }
    
    if (Array.isArray(permissions)) {
      const allowedPermissions = new Set(await companyPermissionIds(req));
      agent.permissions = permissions.filter((permission) => STAFF_PERMISSIONS.includes(permission) && allowedPermissions.has(permission));
    }

    if (email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Enter a valid email address.' });
      }
      if (normalizedEmail !== agent.email) {
        const emailConflict = await User.findOne({ where: { email: normalizedEmail } });
        if (emailConflict) {
          return res.status(409).json({ message: 'Email already registered.' });
        }
        agent.email = normalizedEmail;
      }
    }

    await agent.save();
    const publicAgent = agent.toJSON();
    delete publicAgent.password;
    return res.json({ agent: publicAgent });
  } catch (error) {
    return next(error);
  }
};

exports.deleteAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agent = await User.findOne({ where: { id, role: { [Op.in]: ['agent', 'manager'] } } });
    if (!agent) return res.status(404).json({ message: 'Agent/Manager not found.' });
    await agent.destroy();
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

exports.referralRewards = async (req, res, next) => {
  try {
    const userWhere = req.user?.role === 'agent' ? { assignedAgentId: req.user.id } : undefined;
    const rewards = await ReferralReward.findAll({
      include: [
        { model: User, as: 'referrer', attributes: ['id', 'name', 'email', 'referralCode'], where: userWhere },
        { model: User, as: 'referee', attributes: ['id', 'name', 'email'] },
        { model: Deposit, as: 'deposit', attributes: ['id', 'amount', 'currency', 'status'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ rewards });
  } catch (error) {
    return next(error);
  }
};

exports.reviewReferralReward = (status) => async (req, res, next) => {
  try {
    let result;
    await sequelize.transaction(async (transaction) => {
      const reward = await ReferralReward.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!reward || reward.status !== 'pending') throw apiError('Pending referral reward not found.', 404);

      await reward.update({
        status,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      }, { transaction });

      if (status === 'approved') {
        const { wallet } = await storedSummary(reward.referrerId, transaction);
        const before = money(wallet.balance);
        // Allow admin to override reward amount; fall back to original
        const customAmount = req.body && req.body.amount != null ? Number(req.body.amount) : null;
        const rewardAmount = money(customAmount != null && customAmount > 0 ? customAmount : reward.amount);
        // Update reward record with final amount used
        await reward.update({ amount: rewardAmount }, { transaction });
        const after = money(before + rewardAmount);

        // Fetch primary Live account of referrer to add to it as well
        let liveAccount = await TradingAccount.findOne({
          where: { userId: reward.referrerId, type: 'Live' },
          order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        // Update referrer wallet balance
        await wallet.update({ balance: after }, { transaction });

        // Update referrer primary live account balance
        if (liveAccount) {
          await liveAccount.update({ balance: money(Number(liveAccount.balance) + rewardAmount) }, { transaction });
        }

        // Create transaction record for referrer
        await Transaction.create({
          userId: reward.referrerId,
          type: 'referral',
          amount: rewardAmount,
          bonus: 0,
          status: 'completed',
          balanceBefore: before,
          balanceAfter: after,
          note: `Referral reward for referee deposit. Referee ID: ${reward.refereeId}`,
          referenceType: 'referral_reward',
          referenceId: reward.id,
          description: `Referral Reward`,
          projectId: reward.projectId,
        }, { transaction });

        await storedSummary(reward.referrerId, transaction);
      }

      result = reward;
    });

    return res.json({ reward: result });
  } catch (error) {
    return next(error);
  }
};


// ─── Admin Notifications ────────────────────────────────────────────────────────

/**
 * GET /api/admin/notifications
 * Returns all admin notifications (optionally filtered by isRead).
 * Supports query params: ?unread=true&limit=50&offset=0
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const where = {};
    if (req.user.role !== 'master' && req.user.projectId) {
      where.projectId = req.user.projectId;
    }
    if (unreadOnly) where.isRead = false;

    const { count, rows } = await AdminNotification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const unreadCount = await AdminNotification.count({
      where: { ...where, isRead: false },
    });

    return res.json({ notifications: rows, total: count, unreadCount, limit, offset });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/admin/notifications/:id/read
 * Marks a single notification as read.
 */
exports.markNotificationRead = async (req, res, next) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'master' && req.user.projectId) {
      where.projectId = req.user.projectId;
    }
    const notification = await AdminNotification.findOne({ where });
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    await notification.update({ isRead: true, readAt: new Date() });
    return res.json({ notification });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/admin/notifications/mark-all-read
 * Marks all unread notifications as read for this project.
 */
exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    const where = { isRead: false };
    if (req.user.role !== 'master' && req.user.projectId) {
      where.projectId = req.user.projectId;
    }
    await AdminNotification.update(
      { isRead: true, readAt: new Date() },
      { where }
    );
    return res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/admin/notifications/:id
 * Deletes a single notification.
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'master' && req.user.projectId) {
      where.projectId = req.user.projectId;
    }
    const notification = await AdminNotification.findOne({ where });
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    await notification.destroy();
    return res.json({ message: 'Notification deleted.' });
  } catch (error) {
    return next(error);
  }
};

// Promotion artwork is scoped to this company. Master sessions do not carry
// x-project-id, so resolve NovaFXM explicitly for those requests.
exports.bonusPosts = async (req, res, next) => {
  try {
    const projectId = req.projectId || (await companyProjectFor(req))?.id || null;
    const where = projectId ? { [Op.or]: [{ projectId }, { projectId: null }] } : {};
    const posts = await BonusPost.findAll({ where, order: [['createdAt', 'DESC']], limit: 2 });
    return res.json({ posts });
  } catch (error) { return next(error); }
};

exports.createBonusPost = async (req, res, next) => {
  try {
    const projectId = req.projectId || (await companyProjectFor(req))?.id || null;
    const where = projectId ? { [Op.or]: [{ projectId }, { projectId: null }] } : {};
    if (await BonusPost.count({ where }) >= 2) return res.status(400).json({ message: 'Only two bonus posts can be active. Remove one first.' });
    const { title, image } = req.body || {};
    if (!title || !image || !/^data:image\/(png|jpe?g|webp);base64,/i.test(image)) return res.status(400).json({ message: 'A title and PNG, JPG or WEBP image are required.' });
    const post = await BonusPost.create({ title: String(title).slice(0, 120), image, projectId, createdById: req.user.id });
    return res.status(201).json({ post });
  } catch (error) { return next(error); }
};

exports.deleteBonusPost = async (req, res, next) => {
  try {
    const where = { id: req.params.id };
    const projectId = req.projectId || (await companyProjectFor(req))?.id || null;
    if (projectId) where[Op.or] = [{ projectId }, { projectId: null }];
    const post = await BonusPost.findOne({ where });
    if (!post) return res.status(404).json({ message: 'Bonus post not found.' });
    await post.destroy();
    return res.json({ message: 'Bonus post removed.' });
  } catch (error) { return next(error); }
};

const normalizeRegistrationCode = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '');

exports.registrationCode = async (req, res, next) => {
  try {
    const project = await companyProjectFor(req);
    if (!project) return res.status(404).json({ message: 'NovaFXM company configuration was not found.' });
    const registrationCode = await RegistrationCode.findOne({ where: { projectId: project.id } });
    return res.json({ code: registrationCode?.code || '' });
  } catch (error) { return next(error); }
};

exports.saveRegistrationCode = async (req, res, next) => {
  try {
    const code = normalizeRegistrationCode(req.body?.code);
    if (!/^[A-Z0-9_-]{4,40}$/.test(code)) {
      return res.status(400).json({ message: 'Use 4–40 letters, numbers, hyphens or underscores.' });
    }
    const project = await companyProjectFor(req);
    if (!project) return res.status(404).json({ message: 'NovaFXM company configuration was not found.' });
    const [registrationCode] = await RegistrationCode.upsert({ projectId: project.id, code, updatedById: req.user.id });
    return res.json({ code: registrationCode.code || code, message: 'Registration referral code saved.' });
  } catch (error) { return next(error); }
};

exports.deleteRegistrationCode = async (req, res, next) => {
  try {
    const project = await companyProjectFor(req);
    if (!project) return res.status(404).json({ message: 'NovaFXM company configuration was not found.' });
    await RegistrationCode.destroy({ where: { projectId: project.id } });
    return res.json({ message: 'Registration referral code removed.' });
  } catch (error) { return next(error); }
};
