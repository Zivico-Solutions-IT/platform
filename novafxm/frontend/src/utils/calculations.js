export const contractSize = (symbol) => {
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol === 'US500') return 1;
  if (symbol.includes('XAU') || symbol.includes('OIL')) return 100;
  return 100000;
};

export const calculateRequiredMargin = (symbol, lots, price, leverage = 500) => (
  (Number(lots || 0) * contractSize(symbol || '') * Number(price || 0))
  / Math.max(1, Number(leverage || 500))
);

export const calculateProfit = (position, price) => {
  const direction = position.side === 'BUY' ? 1 : -1;
  return (Number(price) - Number(position.openPrice)) * direction * Number(position.lots) * contractSize(position.symbol);
};

export const STOP_OUT_MARGIN_LEVEL = 70;

export const calculateLiquidationPrice = (position, summary, stopOutMarginLevel = STOP_OUT_MARGIN_LEVEL) => {
  const openPrice = Number(position?.openPrice || position?.entryPrice || 0);
  const currentPrice = Number(position?.currentPrice || openPrice);
  const lots = Number(position?.lots || 0);
  const size = contractSize(position?.symbol || '');
  const exposure = lots * size;

  if (!Number.isFinite(openPrice) || openPrice <= 0 || !Number.isFinite(currentPrice) || currentPrice <= 0 || !Number.isFinite(exposure) || exposure <= 0) {
    return null;
  }

  const accountMargin = Number(summary?.margin || position?.margin || 0);
  const accountEquity = Number(summary?.equity);
  const targetEquity = accountMargin * (Number(stopOutMarginLevel || STOP_OUT_MARGIN_LEVEL) / 100);
  const lossAllowance = Number.isFinite(accountEquity)
    ? accountEquity - targetEquity
    : accountMargin - targetEquity;

  if (!Number.isFinite(accountMargin) || accountMargin <= 0 || !Number.isFinite(lossAllowance)) {
    return null;
  }

  if (lossAllowance <= 0) return currentPrice;

  const priceDistance = lossAllowance / exposure;
  const liquidationPrice = position?.side === 'SELL'
    ? currentPrice + priceDistance
    : currentPrice - priceDistance;

  return liquidationPrice > 0 ? liquidationPrice : 0;
};

export const calculateSummary = (balance, positions) => {
  const openProfit = positions.reduce((total, position) => total + Number(position.profit || 0), 0);
  const margin = positions.reduce((total, position) => (
    total + Number(position.margin || calculateRequiredMargin(position.symbol, position.lots, position.openPrice, position.leverage))
  ), 0);
  const equity = Number(balance) + openProfit;
  const freeFunds = equity - margin;
  const marginLevel = margin ? (equity / margin) * 100 : 0;
  return { balance: Number(balance), equity, margin, freeFunds, marginLevel, openProfit, bonus: 0 };
};
