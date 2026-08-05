const money = (value) => Number(Number(value || 0).toFixed(2));

const contractSize = (symbol = '') => {
  const normalized = String(symbol).toUpperCase();
  if (normalized.includes('BTC') || normalized.includes('ETH') || normalized === 'US500') return 1;
  if (normalized.includes('XAU') || normalized.includes('OIL')) return 100;
  return 100000;
};

const quotePriceForSide = (quote, side, action = 'close') => {
  if (action === 'open') return Number(side === 'BUY' ? quote?.ask : quote?.bid);
  return Number(side === 'BUY' ? quote?.bid : quote?.ask);
};

const fallbackQuotePrice = (quote, side, action = 'close', fallback = 0) => {
  const sidePrice = quotePriceForSide(quote, side, action);
  if (Number.isFinite(sidePrice) && sidePrice > 0) return sidePrice;
  const genericPrice = Number(quote?.price);
  return Number.isFinite(genericPrice) && genericPrice > 0 ? genericPrice : Number(fallback || 0);
};

const requiredMargin = (symbol, lots, price, leverage) => money(
  (Number(lots || 0) * contractSize(symbol) * Number(price || 0))
  / Math.max(1, Number(leverage || 500)),
);

const pnl = (trade, closePrice) => money(
  (Number(closePrice || 0) - Number(trade.openPrice || 0))
  * (trade.side === 'BUY' ? 1 : -1)
  * Number(trade.lots || 0)
  * contractSize(trade.symbol),
);

const openProfitForTrades = (trades = [], pricesBySymbol = new Map()) => money(
  trades.reduce((sum, trade) => {
    const quote = pricesBySymbol.get(trade.symbol);
    const closePrice = fallbackQuotePrice(quote, trade.side, 'close', trade.openPrice);
    return sum + pnl(trade, closePrice);
  }, 0),
);

const marginForTrades = (trades = []) => money(
  trades.reduce((sum, trade) => sum + Number(trade.margin || 0), 0),
);

const accountSummary = (balance, trades = [], pricesBySymbol = new Map()) => {
  const openProfit = openProfitForTrades(trades, pricesBySymbol);
  const margin = marginForTrades(trades);
  const equity = money(Number(balance || 0) + openProfit);
  const freeFunds = money(equity - margin);
  const marginLevel = margin ? (equity / margin) * 100 : 0;
  return { balance: money(balance), equity, margin, freeFunds, marginLevel, openProfit };
};

module.exports = {
  accountSummary,
  contractSize,
  fallbackQuotePrice,
  marginForTrades,
  money,
  openProfitForTrades,
  pnl,
  quotePriceForSide,
  requiredMargin,
};
