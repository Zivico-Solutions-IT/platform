const sequelize = require('../config/db');
const { Wallet, Deposit, Withdrawal, Transaction, Trade, BankAccount, TradingAccount, DepositMethodAddress, ReferralReward, User, AdminNotification } = require('../models');
const tradingView = require('../services/tradingViewService');
const { getIo } = require('../config/socketIo');

const money = (value) => Number(Number(value || 0).toFixed(2));
const depositMinimumFor = (currency) => (String(currency || 'USD').toUpperCase() === 'INR' ? 10000 : 100);
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
const isTrc20Detail = (account) => String(`${account?.bankName || ''} ${account?.branchName || ''}`).toLowerCase().includes('trc20');

exports.claimBirthdayBonus = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found.' });

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

    if (!isBirthdayToday) {
      return res.status(400).json({ message: 'It is not your birthday today.' });
    }

    const currentYear = new Date().getFullYear().toString();
    const existingBonus = await Transaction.findOne({
      where: {
        userId: user.id,
        type: 'admin_add_balance',
        referenceType: 'birthday_bonus',
        description: currentYear
      }
    });

    if (existingBonus) {
      return res.status(400).json({ message: 'You have already claimed your birthday bonus for this year.' });
    }

    await sequelize.transaction(async (transaction) => {
      const wallet = await Wallet.findOne({ where: { userId: user.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!wallet) throw new Error('Wallet not found.');

      const amount = 200.00;
      const currentBalance = Number(wallet.balance || 0);

      await Transaction.create({
        userId: user.id,
        type: 'admin_add_balance',
        amount,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + amount,
        note: 'Birthday Bonus',
        status: 'completed',
        referenceType: 'birthday_bonus',
        description: currentYear
      }, { transaction });

      await wallet.update({ balance: currentBalance + amount }, { transaction });
    });

    return res.json({ message: 'Birthday bonus claimed successfully.' });
  } catch (error) {
    return next(error);
  }
};

exports.getWallet = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    const tradingAccount = req.query.tradingAccountId
      ? await TradingAccount.findOne({ where: { id: req.query.tradingAccountId, userId: req.user.id } })
      : null;
    const tradeWhere = { userId: req.user.id, status: 'open' };
    if (tradingAccount) tradeWhere.tradingAccountId = tradingAccount.id;
    const trades = await Trade.findAll({ where: tradeWhere });
    const prices = await tradingView.getPrices();
    const openProfit = money(trades.reduce((sum, trade) => {
      const market = prices.find((item) => item.symbol === trade.symbol);
      const closePrice = Number(trade.side === 'BUY' ? market?.bid : market?.ask) || market?.price || trade.openPrice;
      return sum + profitFor(trade, closePrice);
    }, 0));
    const margin = money(trades.reduce((sum, trade) => sum + Number(trade.margin), 0));
    const balance = money(tradingAccount ? tradingAccount.balance : wallet.balance);
    const equity = money(balance + openProfit);
    const freeFunds = money(equity - margin);
    if (!tradingAccount || tradingAccount.isPrimary) await wallet.update({ equity, margin, freeFunds });
    let bonus = 0;
    if (tradingAccount) {
      if (tradingAccount.type === 'Live') {
        const [depositBonus, adminBonus] = await Promise.all([
          Deposit.sum('bonus', { where: { userId: req.user.id, tradingAccountId: tradingAccount.id, status: 'approved' } }),
          Transaction.sum('bonus', { where: { userId: req.user.id, referenceType: 'trading_account', referenceId: tradingAccount.id, type: 'admin_add_balance', status: 'completed' } }),
        ]);
        bonus = money(Number(depositBonus || 0) + Number(adminBonus || 0));
      } else {
        bonus = 0;
      }
    } else {
      bonus = money(wallet.bonus);
    }
    return res.json({
      wallet: { ...wallet.toJSON(), equity, margin, freeFunds },
      tradingAccount: tradingAccount ? tradingAccount.toJSON() : null,
      summary: { balance, equity, margin, freeFunds, marginLevel: margin ? (equity / margin) * 100 : 0, openProfit, bonus },
    });
  } catch (error) {
    return next(error);
  }
};

exports.transactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
    return res.json({ transactions });
  } catch (error) {
    return next(error);
  }
};

exports.depositMethods = async (req, res, next) => {
  try {
    const addresses = await DepositMethodAddress.findAll({
      where: { isActive: true },
      order: [['paymentMethod', 'ASC'], ['createdAt', 'DESC']],
    });
    return res.json({ addresses });
  } catch (error) {
    return next(error);
  }
};

exports.deposit = async (req, res, next) => {
  try {
    const { amount, paymentMethod, receiptImage, note, tradingAccountId, currency = 'USD', depositAddressId, depositAddress } = req.body;
    const normalizedCurrency = String(currency || 'USD').toUpperCase() === 'INR' ? 'INR' : 'USD';
    const minimum = depositMinimumFor(normalizedCurrency);
    if (!(Number(amount) >= minimum) || !paymentMethod) {
      return res.status(400).json({ message: `Minimum deposit is ${normalizedCurrency === 'INR' ? '₹' : '$'}${minimum}. Payment method is required.` });
    }
    const assignedAddress = depositAddressId
      ? await DepositMethodAddress.findOne({ where: { id: depositAddressId, paymentMethod, isActive: true } })
      : null;
    if (depositAddressId && !assignedAddress) {
      return res.status(400).json({ message: 'Selected deposit address is not available for this payment method.' });
    }
    let deposit;
    await sequelize.transaction(async (transaction) => {
      const wallet = await Wallet.findOne({ where: { userId: req.user.id }, transaction });
      const tradingAccount = tradingAccountId
        ? await TradingAccount.findOne({ where: { id: tradingAccountId, userId: req.user.id, type: 'Live' }, transaction })
        : null;
      if (tradingAccountId && !tradingAccount) {
        throw Object.assign(new Error('Selected live account was not found.'), { status: 404 });
      }
      deposit = await Deposit.create({
        userId: req.user.id,
        tradingAccountId: tradingAccount?.id || null,
        amount,
        currency: normalizedCurrency,
        paymentMethod,
        depositAddressId: assignedAddress?.id || null,
        depositAddressLabel: assignedAddress?.label || null,
        depositAddress: assignedAddress?.address || depositAddress || null,
        receiptImage,
        note,
      }, { transaction });
      await Transaction.create({
        userId: req.user.id,
        type: 'deposit',
        amount,
        bonus: 0,
        status: 'pending',
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance,
        note,
        referenceType: 'deposit',
        referenceId: deposit.id,
        description: `Deposit via ${paymentMethod}`,
      }, { transaction });

      // Create a pending referral reward if the depositor has a referrer
      const depositor = await User.findByPk(req.user.id, { transaction });
      if (depositor && depositor.referredById) {
        const rewardAmount = money(Number(amount) * 0.10);
        if (rewardAmount > 0) {
          await ReferralReward.create({
            projectId: depositor.projectId,
            referrerId: depositor.referredById,
            refereeId: req.user.id,
            depositId: deposit.id,
            amount: rewardAmount,
            status: 'pending',
          }, { transaction });
        }
      }
    });

    // Admin notification for new deposit
    try {
      const depositorUser = await User.findByPk(req.user.id, { attributes: ['name', 'email', 'projectId'] });
      const notification = await AdminNotification.create({
        projectId: depositorUser?.projectId || null,
        type: 'new_deposit',
        title: 'New Deposit Request',
        message: `${depositorUser?.name || 'A user'} requested a deposit of $${Number(amount).toFixed(2)} via ${paymentMethod}.`,
        referenceType: 'deposit',
        referenceId: deposit.id,
        userId: req.user.id,
      });
      const io = getIo();
      if (io) {
        io.emit('admin:notification', {
          id: notification.id,
          type: 'new_deposit',
          title: notification.title,
          message: notification.message,
          referenceType: 'deposit',
          referenceId: deposit.id,
          userId: req.user.id,
          projectId: depositorUser?.projectId || null,
          createdAt: notification.createdAt,
        });
      }
    } catch (notifError) {
      console.error('[wallet] Failed to create admin notification for deposit:', notifError.message);
    }

    return res.status(201).json({ deposit });
  } catch (error) {
    return next(error);
  }
};

exports.withdraw = async (req, res, next) => {
  try {
    if (req.user.verificationStatus !== 'approved') {
      return res.status(403).json({ message: 'Complete account verification before withdrawals.' });
    }
    const { amount, withdrawalMethod = 'Bank', bankAccountId, tradingAccountId } = req.body;
    const method = withdrawalMethod === 'Crypto' ? 'Crypto' : 'Bank';
    if (!(Number(amount) > 0) || !bankAccountId) {
      return res.status(400).json({ message: 'Amount and an approved withdrawal detail are required.' });
    }
    const tradingAccount = tradingAccountId
      ? await TradingAccount.findOne({ where: { id: tradingAccountId, userId: req.user.id } })
      : null;
    const accountType = tradingAccount?.type || req.user.accountType || 'Demo';
    if (accountType !== 'Live') {
      return res.status(403).json({ message: 'Withdrawals are available only from Live accounts. Demo accounts cannot withdraw.' });
    }
    const savedDetail = await BankAccount.findOne({
      where: {
        id: bankAccountId,
        userId: req.user.id,
        status: 'approved',
      },
    });
    if (!savedDetail || (method === 'Crypto') !== isTrc20Detail(savedDetail)) {
      return res.status(400).json({ message: 'Select an approved withdrawal detail from Settings.' });
    }
    const bankName = savedDetail.bankName;
    const accountNumber = savedDetail.accountNumber;
    const accountHolderName = savedDetail.accountHolderName;
    let withdrawal;
    await sequelize.transaction(async (transaction) => {
      const wallet = await Wallet.findOne({ where: { userId: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
      const existingPendingWithdrawal = await Withdrawal.findOne({
        where: { userId: req.user.id, status: 'pending' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existingPendingWithdrawal) {
        throw Object.assign(new Error('Another withdrawal request is pending. Please wait for it to be approved or rejected before submitting a new withdrawal.'), { status: 409 });
      }
      const pending = await Withdrawal.sum('amount', { where: { userId: req.user.id, status: 'pending' }, transaction });
      if (Number(amount) > Number(wallet.balance) - Number(pending || 0)) {
        throw Object.assign(new Error('Insufficient withdrawable balance.'), { status: 400 });
      }
      withdrawal = await Withdrawal.create({
        userId: req.user.id,
        amount,
        withdrawalMethod: method,
        bankName,
        accountNumber,
        accountHolderName,
      }, { transaction });
      await Transaction.create({
        userId: req.user.id,
        type: 'withdrawal',
        amount,
        status: 'pending',
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance,
        referenceType: 'withdrawal',
        referenceId: withdrawal.id,
        description: method === 'Bank' ? `Withdrawal to ${bankName}` : `Crypto withdrawal to ${bankName}`,
      }, { transaction });
    });

    // Admin notification for new withdrawal
    try {
      const withdrawerUser = await User.findByPk(req.user.id, { attributes: ['name', 'email', 'projectId'] });
      const notification = await AdminNotification.create({
        projectId: withdrawerUser?.projectId || null,
        type: 'new_withdrawal',
        title: 'New Withdrawal Request',
        message: `${withdrawerUser?.name || 'A user'} requested a withdrawal of $${Number(amount).toFixed(2)} via ${method}.`,
        referenceType: 'withdrawal',
        referenceId: withdrawal.id,
        userId: req.user.id,
      });
      const io = getIo();
      if (io) {
        io.emit('admin:notification', {
          id: notification.id,
          type: 'new_withdrawal',
          title: notification.title,
          message: notification.message,
          referenceType: 'withdrawal',
          referenceId: withdrawal.id,
          userId: req.user.id,
          projectId: withdrawerUser?.projectId || null,
          createdAt: notification.createdAt,
        });
      }
    } catch (notifError) {
      console.error('[wallet] Failed to create admin notification for withdrawal:', notifError.message);
    }

    return res.status(201).json({ withdrawal });
  } catch (error) {
    return next(error);
  }
};
