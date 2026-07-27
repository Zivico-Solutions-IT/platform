const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Wallet, Trade, Transaction, TradingAccount } = require('../models');
const tradingView = require('../services/tradingViewService');
const { accountSummary, fallbackQuotePrice, money, pnl, requiredMargin } = require('../utils/tradeMath');

const MIN_LOTS = Number(process.env.MIN_TRADE_LOTS || 0.01);
const optionalPrice = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const validateRiskLevels = (side, livePrice, stopLoss, takeProfit) => {
  if (!Number.isFinite(livePrice) || livePrice <= 0) return 'Live price is not available.';
  if (side === 'BUY') {
    if (takeProfit !== null && takeProfit <= livePrice) return 'BUY Take Profit must be above the live price.';
    if (stopLoss !== null && stopLoss >= livePrice) return 'BUY Stop Loss must be below the live price.';
  } else {
    if (takeProfit !== null && takeProfit >= livePrice) return 'SELL Take Profit must be below the live price.';
    if (stopLoss !== null && stopLoss <= livePrice) return 'SELL Stop Loss must be above the live price.';
  }
  return '';
};



const normalizeOrderType = (value) => {
  const orderType = String(value || 'market').toLowerCase();
  return ['market', 'limit', 'stop'].includes(orderType) ? orderType : null;
};

exports.open = async (req, res, next) => {
  try {
    if (req.user.tradingStatus === 'frozen') {
      return res.status(403).json({ message: 'Your trading access is frozen. Please contact support.' });
    }
    const { symbol, side, lots, tradingAccountId } = req.body;
    const orderType = normalizeOrderType(req.body.orderType);
    const stopLoss = optionalPrice(req.body.stopLoss);
    const takeProfit = optionalPrice(req.body.takeProfit);
    if (!symbol || !['BUY', 'SELL'].includes(side) || !(Number(lots) >= MIN_LOTS)) {
      return res.status(400).json({ message: 'Valid symbol, side and lots are required.' });
    }
    if (!orderType) {
      return res.status(400).json({ message: 'Order type must be market, limit, or stop.' });
    }
    const tradingAccount = tradingAccountId
      ? await TradingAccount.findOne({ where: { id: tradingAccountId, userId: req.user.id } })
      : await TradingAccount.findOne({ where: { userId: req.user.id, isPrimary: true } });
    if (!tradingAccount) {
      return res.status(400).json({ message: 'Select a valid trading account.' });
    }
    if (tradingAccount.status !== 'active') {
      return res.status(403).json({ message: 'This trading account is not active.' });
    }
    const market = await tradingView.getPrice(symbol);
    const marketPrice = side === 'BUY' ? market.ask : market.bid;
    const entryPrice = orderType === 'market' ? marketPrice : optionalPrice(req.body.entryPrice);
    if (!entryPrice) {
      return res.status(400).json({ message: 'Entry price is required for limit and stop orders.' });
    }
    if (orderType === 'limit') {
      const ask = Number(market.ask);
      const bid = Number(market.bid);
      if (side === 'BUY') {
        if (entryPrice >= ask) {
          return res.status(400).json({ success: false, message: 'Buy Limit price must be below the current Ask price.' });
        }
      } else if (side === 'SELL') {
        if (entryPrice <= bid) {
          return res.status(400).json({ success: false, message: 'Sell Limit price must be above the current Bid price.' });
        }
      }
    } else if (orderType === 'stop') {
      const ask = Number(market.ask);
      const bid = Number(market.bid);
      if (side === 'BUY') {
        if (entryPrice <= ask) {
          return res.status(400).json({ success: false, message: 'Buy Stop price must be above the current Ask price.' });
        }
      } else if (side === 'SELL') {
        if (entryPrice >= bid) {
          return res.status(400).json({ success: false, message: 'Sell Stop price must be below the current Bid price.' });
        }
      }
    }
    const leverage = tradingAccount.leverage || req.user.leverage;
    const margin = requiredMargin(symbol, lots, entryPrice, leverage);
    const riskError = validateRiskLevels(side, marketPrice, stopLoss, takeProfit);
    if (riskError) {
      return res.status(400).json({ message: riskError });
    }
    let trade;
    await sequelize.transaction(async (transaction) => {
      const account = await TradingAccount.findOne({ where: { id: tradingAccount.id, userId: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!account) throw Object.assign(new Error('Select a valid trading account.'), { status: 400 });
      const wallet = await Wallet.findOne({ where: { userId: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
      const openTrades = await Trade.findAll({ where: { userId: req.user.id, tradingAccountId: tradingAccount.id, status: 'open' }, transaction });
      const prices = await tradingView.getPrices();
      const summary = accountSummary(account.balance, openTrades, new Map(prices.map((item) => [item.symbol, item])));
      if (summary.freeFunds < margin) {
        throw Object.assign(new Error('Insufficient free funds.'), { status: 400 });
      }
      trade = await Trade.create({
        userId: req.user.id,
        tradingAccountId: tradingAccount.id,
        symbol,
        side,
        lots,
        orderType,
        entryPrice,
        openPrice: entryPrice,
        stopLoss,
        takeProfit,
        margin,
        status: orderType === 'market' ? 'open' : 'pending',
      }, { transaction });
      const nextMargin = money(summary.margin + margin);
      if (orderType === 'market' && account.isPrimary) {
        await wallet.update({ equity: summary.equity, margin: nextMargin, freeFunds: money(summary.equity - nextMargin) }, { transaction });
      }
    });
    return res.status(201).json({ trade });
  } catch (error) {
    return next(error);
  }
};

exports.updateRisk = async (req, res, next) => {
  try {
    const trade = await Trade.findOne({ where: { id: req.params.id, userId: req.user.id, status: { [Op.in]: ['open', 'pending'] } } });
    if (!trade) return res.status(404).json({ message: 'Active trade or pending order not found.' });
    const hasStopLoss = Object.prototype.hasOwnProperty.call(req.body, 'stopLoss');
    const hasTakeProfit = Object.prototype.hasOwnProperty.call(req.body, 'takeProfit');
    if (!hasStopLoss && !hasTakeProfit) return res.status(400).json({ message: 'Provide a Stop Loss or Take Profit value.' });
    const stopLoss = hasStopLoss ? optionalPrice(req.body.stopLoss) : optionalPrice(trade.stopLoss);
    const takeProfit = hasTakeProfit ? optionalPrice(req.body.takeProfit) : optionalPrice(trade.takeProfit);
    const market = await tradingView.getPrice(trade.symbol);
    const livePrice = trade.status === 'pending'
      ? Number(trade.openPrice)
      : trade.side === 'BUY' ? market.ask : market.bid;
    const riskError = validateRiskLevels(trade.side, livePrice, stopLoss, takeProfit);
    if (riskError) {
      return res.status(400).json({ message: riskError });
    }
    await trade.update({ stopLoss, takeProfit });
    return res.json({ trade });
  } catch (error) {
    return next(error);
  }
};

exports.close = async (req, res, next) => {
  try {
    const trade = await Trade.findOne({ where: { id: req.params.id, userId: req.user.id, status: 'open' } });
    if (!trade) return res.status(404).json({ message: 'Open trade not found.' });
    const market = await tradingView.getPrice(trade.symbol);
    const closePrice = fallbackQuotePrice(market, trade.side, 'close', trade.openPrice);
    const profit = pnl(trade, closePrice);
    let tradingAccount;
    await sequelize.transaction(async (transaction) => {
      await trade.update({ closePrice, profit, status: 'closed', closedAt: new Date() }, { transaction });
      tradingAccount = await TradingAccount.findOne({ where: { id: trade.tradingAccountId, userId: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!tradingAccount) throw Object.assign(new Error('Trading account not found.'), { status: 404 });
      const wallet = await Wallet.findOne({ where: { userId: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
      const before = money(tradingAccount.balance);
      const after = money(before + profit);
      const remainingMargin = Number(await Trade.sum('margin', {
        where: { userId: req.user.id, tradingAccountId: tradingAccount.id, status: 'open' },
        transaction,
      }) || 0);
      const margin = money(Math.max(0, remainingMargin));
      await tradingAccount.update({ balance: after }, { transaction });
      if (tradingAccount.isPrimary) {
        await wallet.update({ balance: after, equity: after, margin, freeFunds: money(after - margin) }, { transaction });
      }
      await Transaction.create({
        userId: req.user.id,
        type: profit >= 0 ? 'trade_profit' : 'trade_loss',
        amount: Math.abs(profit),
        status: 'completed',
        balanceBefore: before,
        balanceAfter: after,
        note: `${trade.side} ${trade.symbol} position closed`,
        referenceType: 'trade',
        referenceId: trade.id,
        description: `${trade.side} ${trade.symbol} trade closed`,
      }, { transaction });
    });
    return res.json({ trade, tradingAccount });
  } catch (error) {
    return next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const trade = await Trade.findOne({ where: { id: req.params.id, userId: req.user.id, status: 'pending' } });
    if (!trade) return res.status(404).json({ message: 'Pending order not found.' });
    await trade.destroy();
    return res.json({ message: 'Pending order cancelled.', trade });
  } catch (error) {
    return next(error);
  }
};

exports.openTrades = async (req, res, next) => {
  try {
    const where = { userId: req.user.id, status: 'open' };
    if (req.query.tradingAccountId) where.tradingAccountId = req.query.tradingAccountId;
    return res.json({ trades: await Trade.findAll({ where, order: [['createdAt', 'DESC']] }) });
  } catch (error) {
    return next(error);
  }
};

exports.pendingTrades = async (req, res, next) => {
  try {
    const where = { userId: req.user.id, status: 'pending' };
    if (req.query.tradingAccountId) where.tradingAccountId = req.query.tradingAccountId;
    return res.json({ trades: await Trade.findAll({ where, order: [['createdAt', 'DESC']] }) });
  } catch (error) {
    return next(error);
  }
};

exports.closedTrades = async (req, res, next) => {
  try {
    const where = { userId: req.user.id, status: 'closed' };
    if (req.query.tradingAccountId) where.tradingAccountId = req.query.tradingAccountId;
    return res.json({ trades: await Trade.findAll({ where, order: [['closedAt', 'DESC']] }) });
  } catch (error) {
    return next(error);
  }
};
