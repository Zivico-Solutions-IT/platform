const { Op } = require('sequelize');
const { User, Wallet, Transaction, TradingAccount, Trade, BankAccount, Deposit, ReferralReward } = require('../models');

const money = (value) => Number(Number(value || 0).toFixed(2));

const publicNumberFor = (id) => String(Number(id) + 2099).padStart(6, '0');
const referralCodeFor = (user) => `NVX${publicNumberFor(user.id)}`;
const ACCOUNT_LIMITS = {
  Demo: 2,
  Live: 5,
};

async function ensureReferralCode(user) {
  if (!user) return null;
  if (!user.id) return null;
  const referralCode = referralCodeFor(user);
  if (user.referralCode === referralCode) return referralCode;
  if (typeof user.update === 'function') {
    await user.update({ referralCode }).catch(() => {});
  }
  return referralCode;
}

async function ensureDefaultAccounts(user, wallet) {
  // Referral registration happens before an authenticated tenant context
  // exists. Older registrations can therefore have tenant-owned rows with a
  // NULL projectId. Adopt only this user's legacy rows before checking whether
  // defaults exist; otherwise the tenant-scoped count returns zero and creates
  // another Demo/Live pair every time the dashboard is opened.
  if (user.projectId) {
    await Promise.all([
      Wallet.update(
        { projectId: user.projectId },
        { where: { userId: user.id, projectId: null }, skipProjectId: true },
      ),
      TradingAccount.update(
        { projectId: user.projectId },
        { where: { userId: user.id, projectId: null }, skipProjectId: true },
      ),
    ]);
  }
  const count = await TradingAccount.count({ where: { userId: user.id } });
  if (count > 0) return;

  const demoBalance = user.accountType === 'Demo' ? money(wallet?.balance || 5000) : 5000;
  await TradingAccount.bulkCreate([
    {
      userId: user.id,
      projectId: user.projectId,
      type: 'Demo',
      name: 'Demo account 1',
      balance: demoBalance,
      leverage: user.leverage || 500,
      status: 'active',
      isPrimary: user.accountType !== 'Live',
    },
    {
      userId: user.id,
      projectId: user.projectId,
      type: 'Live',
      name: 'Live account 1',
      balance: 0,
      leverage: user.leverage || 500,
      status: 'active',
      isPrimary: user.accountType === 'Live',
    },
  ]);
}

async function syncExistingAccountBalances(userId, wallet, user) {
  // Only auto-fill demo balance for Demo account type users
  if (!user || user.accountType !== 'Demo') return;
  const firstDemo = await TradingAccount.findOne({
    where: { userId, type: 'Demo' },
    order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
  });
  if (firstDemo && money(firstDemo.balance) === 0) {
    await firstDemo.update({ balance: 5000 });
  }
}

async function dashboardForUser(userId, origin = '') {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password'] },
    include: [{ model: Wallet, as: 'wallet' }],
  });
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });

  const referralCode = await ensureReferralCode(user);
  await ensureDefaultAccounts(user, user.wallet);
  await syncExistingAccountBalances(userId, user.wallet, user);
  await TradingAccount.update({ status: 'active' }, { where: { userId, type: 'Live', status: 'pending' } });

  // Every authenticated client profile, including staff using the normal
  // platform, participates in the referral programme.
  const isRegularUser = true;

  let isBirthdayToday = false;
  if (user.dateOfBirth) {
    const today = new Date();
    const parts = user.dateOfBirth.split('/');
    if (parts.length >= 2) {
      const day = parseInt(parts[0].trim(), 10);
      const month = parseInt(parts[1].trim(), 10);
      if (day === today.getDate() && month === today.getMonth() + 1) {
        isBirthdayToday = true;
      }
    }
  }

  let canClaimBirthdayBonus = false;

  if (isBirthdayToday && user.wallet) {
    const currentYear = new Date().getFullYear().toString();
    const existingBonus = await Transaction.findOne({
      where: {
        userId: user.id,
        type: 'admin_add_balance',
        referenceType: 'birthday_bonus',
        description: currentYear
      }
    });

    if (!existingBonus) {
      canClaimBirthdayBonus = true;
    }
  }

  const [accounts, bankAccounts, referrals, referrer, deposits] = await Promise.all([
    TradingAccount.findAll({ where: { userId }, order: [['createdAt', 'ASC']] }),
    BankAccount.findAll({ where: { userId }, order: [['updatedAt', 'DESC']] }),
    // Only count regular users (not agents/managers) referred by this user
    isRegularUser
      ? User.findAll({
          where: { referredById: userId, role: 'user' },
          attributes: ['id', 'name', 'email', 'accountType', 'createdAt'],
          order: [['createdAt', 'DESC']],
        })
      : Promise.resolve([]),
    // Only show referrer info if this user actually came via a referral link
    isRegularUser && user.referredById
      ? User.findByPk(user.referredById, { attributes: ['id', 'name', 'email', 'referralCode'] })
      : null,
    Deposit.findAll({
      attributes: ['id', 'tradingAccountId', 'amount', 'bonus', 'currency', 'status', 'createdAt'],
      where: { userId, status: 'approved' },
      order: [['createdAt', 'DESC']],
    }),
  ]);
  const liveAccountIds = accounts.filter((account) => account.type === 'Live').map((account) => account.id);
  const liveAccountNames = new Map(accounts.map((account) => [Number(account.id), account.name]));
  const [allRecentTransactions, liveTradesForTransactions, recentLiveTrades, adminFundingDeposits] = liveAccountIds.length
    ? await Promise.all([
      Transaction.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 50 }),
      Trade.findAll({ where: { userId, tradingAccountId: { [Op.in]: liveAccountIds } }, attributes: ['id'] }),
      Trade.findAll({
        where: { userId, tradingAccountId: { [Op.in]: liveAccountIds } },
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
      Transaction.findAll({
        where: {
          userId,
          type: 'admin_add_balance',
          status: 'completed',
          referenceType: 'trading_account',
          referenceId: { [Op.in]: liveAccountIds },
        },
        order: [['createdAt', 'DESC']],
      }),
    ])
    : [[], [], [], []];
  const liveTradeIds = new Set(liveTradesForTransactions.map((trade) => Number(trade.id)));
  const liveTransactions = allRecentTransactions
    .filter((transaction) => {
      if (['deposit', 'withdrawal'].includes(transaction.type)) return true;
      if (transaction.referenceType === 'trading_account') return liveAccountIds.includes(Number(transaction.referenceId));
      if (transaction.referenceType === 'trade') return liveTradeIds.has(Number(transaction.referenceId));
      return false;
    })
    .slice(0, 25);
  const liveTrades = recentLiveTrades.map((trade) => ({
    ...trade.toJSON(),
    accountName: liveAccountNames.get(Number(trade.tradingAccountId)) || 'Live account',
  }));

  const referralIds = referrals.map((item) => item.id);
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

  const referralCommission = isRegularUser
    ? (await ReferralReward.sum('amount', {
        where: { referrerId: userId, status: 'approved' }
      }) || 0)
    : 0;

  const referralRewards = isRegularUser
    ? await ReferralReward.findAll({
        where: { referrerId: userId },
        include: [
          { model: User, as: 'referee', attributes: ['id', 'name', 'email'] },
          { model: Deposit, as: 'deposit', attributes: ['id', 'amount', 'currency', 'status'] },
        ],
        order: [['createdAt', 'DESC']],
      })
    : [];
  
  const isHosted = process.env.NODE_ENV === 'production' || 
    (process.env.DB_HOST && !/^(localhost|127\.0\.0\.1)$/i.test(process.env.DB_HOST));
  const defaultFrontendUrl = isHosted
    ? 'https://novafxm.com'
    : 'http://localhost:8081';

  // Determine base URL, prioritizing non-localhost origins/FRONTEND_URLs in hosted environments
  let baseUrl = defaultFrontendUrl;
  const isLocalHost = (url) => /^(https?:\/\/)?(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?(\/|$)/i.test(url || '');

  if (origin && !isLocalHost(origin)) {
    baseUrl = origin;
  } else if (process.env.FRONTEND_URL && !isLocalHost(process.env.FRONTEND_URL)) {
    baseUrl = process.env.FRONTEND_URL;
  } else if (origin) {
    baseUrl = origin;
  } else if (process.env.FRONTEND_URL) {
    baseUrl = process.env.FRONTEND_URL;
  }

  return {
    user: user.toJSON(),
    wallet: user.wallet,
    accounts,
    bankAccounts,
    deposits: [
      ...deposits,
      ...adminFundingDeposits.map((transaction) => ({
        id: `admin-${transaction.id}`,
        tradingAccountId: transaction.referenceId,
        amount: money(Number(transaction.amount || 0) + Number(transaction.bonus || 0)),
        bonus: money(transaction.bonus),
        currency: 'USD',
        status: 'completed',
        createdAt: transaction.createdAt,
      })),
    ],
    transactions: liveTransactions,
    liveTrades,
    referral: isRegularUser ? {
      code: referralCode,
      url: `${baseUrl.replace(/\/$/, '')}/register?ref=${encodeURIComponent(referralCode)}`,
      commissionRate: 0.10,
      commission: money(referralCommission),
      approvedDeposits: money(approvedDeposits),
      pendingDeposits: money(pendingDeposits),
      referralCount: referrals.length,
      referrer,
      referrals,
      rewards: referralRewards,
    } : null,
    isBirthdayToday,
    canClaimBirthdayBonus,
  };
}

async function createTradingAccount(userId, type) {
  const accountType = type === 'Live' ? 'Live' : 'Demo';
  const maxAccounts = ACCOUNT_LIMITS[accountType];
  const existingCount = await TradingAccount.count({ where: { userId, type: accountType } });
  if (existingCount >= maxAccounts) {
    throw Object.assign(new Error(`You can create only ${maxAccounts} ${accountType.toLowerCase()} accounts.`), { status: 400 });
  }
  const balance = accountType === 'Demo' ? 5000 : 0;
  const account = await TradingAccount.create({
    userId,
    type: accountType,
    name: `${accountType} account ${existingCount + 1}`,
    balance,
    leverage: 500,
    status: 'active',
    isPrimary: false,
  });
  return account;
}

module.exports = {
  createTradingAccount,
  dashboardForUser,
  ensureReferralCode,
};
