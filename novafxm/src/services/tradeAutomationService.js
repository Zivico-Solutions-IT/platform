const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Trade, TradingAccount, Wallet, Transaction } = require('../models');

const money = (value) => Number(Number(value || 0).toFixed(2));
const contractSize = (symbol) => (
  symbol.includes('BTC') || symbol.includes('ETH') || symbol === 'US500'
    ? 1
    : symbol.includes('XAU') || symbol.includes('OIL') ? 100 : 100000
);
const pnl = (trade, closePrice) => money(
  (Number(closePrice) - Number(trade.openPrice))
  * (trade.side === 'BUY' ? 1 : -1)
  * Number(trade.lots)
  * contractSize(trade.symbol),
);
const accountStopOutMarginLevel = Number(process.env.ACCOUNT_STOP_OUT_MARGIN_LEVEL || 70);

let processing = false;
let lastProcessedAt = 0;

const quotePriceForSide = (quote, side, action) => {
  if (action === 'open') return Number(side === 'BUY' ? quote.ask : quote.bid);
  return Number(side === 'BUY' ? quote.bid : quote.ask);
};

const pendingOrderTriggered = (trade, quote) => {
  const entry = Number(trade.entryPrice || trade.openPrice);
  const price = quotePriceForSide(quote, trade.side, 'open');
  if (!Number.isFinite(entry) || !Number.isFinite(price)) return false;

  if (trade.orderType === 'limit') {
    return trade.side === 'BUY' ? price <= entry : price >= entry;
  }
  if (trade.orderType === 'stop') {
    return trade.side === 'BUY' ? price >= entry : price <= entry;
  }
  return false;
};

const protectionClose = (trade, quote) => {
  const closePrice = quotePriceForSide(quote, trade.side, 'close');
  const stopLoss = Number(trade.stopLoss || 0);
  const takeProfit = Number(trade.takeProfit || 0);
  if (!Number.isFinite(closePrice)) return null;

  if (trade.side === 'BUY') {
    if (stopLoss > 0 && closePrice <= stopLoss) return { closePrice: stopLoss, triggerType: 'stop loss' };
    if (takeProfit > 0 && closePrice >= takeProfit) return { closePrice: takeProfit, triggerType: 'take profit' };
  } else {
    if (stopLoss > 0 && closePrice >= stopLoss) return { closePrice: stopLoss, triggerType: 'stop loss' };
    if (takeProfit > 0 && closePrice <= takeProfit) return { closePrice: takeProfit, triggerType: 'take profit' };
  }

  return null;
};

const tradeSnapshot = (trade, quoteBySymbol) => {
  const quote = quoteBySymbol.get(trade.symbol);
  const closePrice = quotePriceForSide(quote, trade.side, 'close');
  if (!Number.isFinite(closePrice) || closePrice <= 0) return null;
  return { trade, closePrice, profit: pnl(trade, closePrice) };
};

const accountMarginLevel = (balance, snapshots) => {
  const margin = money(snapshots.reduce((sum, item) => sum + Number(item.trade.margin || 0), 0));
  if (margin <= 0) return Infinity;
  const openProfit = money(snapshots.reduce((sum, item) => sum + Number(item.profit || 0), 0));
  const equity = money(Number(balance || 0) + openProfit);
  return (equity / margin) * 100;
};

const activatePendingTrade = async (trade) => {
  await sequelize.transaction(async (transaction) => {
    const lockedTrade = await Trade.findOne({
      where: { id: trade.id, status: 'pending' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!lockedTrade) return;

    const account = await TradingAccount.findOne({
      where: { id: lockedTrade.tradingAccountId, userId: lockedTrade.userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!account || account.status !== 'active') return;

    const currentMargin = Number(await Trade.sum('margin', {
      where: { userId: lockedTrade.userId, tradingAccountId: account.id, status: 'open' },
      transaction,
    }) || 0);
    if (Number(account.balance) - currentMargin < Number(lockedTrade.margin)) return;

    await lockedTrade.update({ status: 'open' }, { transaction });
    if (account.isPrimary) {
      const wallet = await Wallet.findOne({ where: { userId: lockedTrade.userId }, transaction, lock: transaction.LOCK.UPDATE });
      const nextMargin = money(currentMargin + Number(lockedTrade.margin));
      await wallet.update({ margin: nextMargin, freeFunds: money(Number(account.balance) - nextMargin) }, { transaction });
    }
  });
};

const closeProtectedTrade = async (trade, closePrice, triggerType) => {
  await sequelize.transaction(async (transaction) => {
    const lockedTrade = await Trade.findOne({
      where: { id: trade.id, status: 'open' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!lockedTrade) return;

    const profit = pnl(lockedTrade, closePrice);
    await lockedTrade.update({ closePrice, profit, status: 'closed', closedAt: new Date() }, { transaction });

    const account = await TradingAccount.findOne({
      where: { id: lockedTrade.tradingAccountId, userId: lockedTrade.userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!account) return;

    const before = money(account.balance);
    const after = money(before + profit);
    await account.update({ balance: after }, { transaction });

    if (account.isPrimary) {
      const wallet = await Wallet.findOne({ where: { userId: lockedTrade.userId }, transaction, lock: transaction.LOCK.UPDATE });
      const remainingMargin = Number(await Trade.sum('margin', {
        where: { userId: lockedTrade.userId, tradingAccountId: account.id, status: 'open' },
        transaction,
      }) || 0);
      const margin = money(Math.max(0, remainingMargin));
      await wallet.update({ balance: after, equity: after, margin, freeFunds: money(after - margin) }, { transaction });
    }

    await Transaction.create({
      userId: lockedTrade.userId,
      type: profit >= 0 ? 'trade_profit' : 'trade_loss',
      amount: Math.abs(profit),
      status: 'completed',
      balanceBefore: before,
      balanceAfter: after,
      note: `${lockedTrade.side} ${lockedTrade.symbol} ${triggerType} triggered`,
      referenceType: 'trade',
      referenceId: lockedTrade.id,
      description: `${lockedTrade.side} ${lockedTrade.symbol} protection order closed`,
    }, { transaction });
  });
};

const processTradeTriggers = async (prices) => {
  if (processing || Date.now() - lastProcessedAt < 1000) return;
  processing = true;
  lastProcessedAt = Date.now();

  try {
    const quoteBySymbol = new Map((prices || []).map((quote) => [quote.symbol, quote]));
    const trades = await Trade.findAll({
      where: { status: { [Op.in]: ['pending', 'open'] } },
      order: [['createdAt', 'ASC']],
    });
    const openTradesByAccount = new Map();
    trades
      .filter((trade) => trade.status === 'open')
      .forEach((trade) => {
        const key = `${trade.userId}:${trade.tradingAccountId}`;
        openTradesByAccount.set(key, [...(openTradesByAccount.get(key) || []), trade]);
      });

    for (const accountTrades of openTradesByAccount.values()) {
      const account = await TradingAccount.findOne({
        where: { id: accountTrades[0].tradingAccountId, userId: accountTrades[0].userId },
      });
      if (!account) continue;
      const snapshots = accountTrades
        .map((trade) => tradeSnapshot(trade, quoteBySymbol))
        .filter(Boolean);
      if (!snapshots.length) continue;
      const marginLevel = accountMarginLevel(account.balance, snapshots);
      if (marginLevel > accountStopOutMarginLevel) continue;
      const worst = snapshots.reduce((selected, item) => (
        Number(item.profit || 0) < Number(selected.profit || 0) ? item : selected
      ), snapshots[0]);
      await closeProtectedTrade(worst.trade, worst.closePrice, 'margin stop-out');
    }

    for (const trade of trades) {
      const quote = quoteBySymbol.get(trade.symbol);
      if (!quote) continue;

      if (trade.status === 'pending' && pendingOrderTriggered(trade, quote)) {
        await activatePendingTrade(trade);
        continue;
      }

      if (trade.status === 'open') {
        const protection = protectionClose(trade, quote);
        if (protection) await closeProtectedTrade(trade, protection.closePrice, protection.triggerType);
      }
    }
  } catch (error) {
    console.warn('Trade automation failed:', error.message);
  } finally {
    processing = false;
  }
};

module.exports = { processTradeTriggers };
