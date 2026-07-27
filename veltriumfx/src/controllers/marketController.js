const tradingView = require('../services/tradingViewService');
const { Project } = require('../models');

const hiddenSymbolsFor = async (projectId) => {
  if (!projectId) return new Set();
  const project = await Project.findByPk(projectId);
  const visibility = project?.symbolVisibility && typeof project.symbolVisibility === 'object'
    ? project.symbolVisibility
    : {};
  return new Set(Object.entries(visibility).filter(([, visible]) => visible === false).map(([symbol]) => symbol));
};

exports.symbols = async (req, res, next) => {
  try {
    const hiddenSet = await hiddenSymbolsFor(req.projectId);
    
    const list = tradingView.instruments
      .filter(inst => !hiddenSet.has(inst.symbol))
      .map(({ ticker, scanner, fallback, ...symbol }) => ({ 
        ...symbol, 
        tradingViewSymbol: ticker 
      }));
      
    return res.json({ symbols: list });
  } catch (error) {
    return next(error);
  }
};

exports.prices = async (req, res, next) => {
  try {
    const hiddenSet = await hiddenSymbolsFor(req.projectId);
    
    const allPrices = await tradingView.getPrices();
    const filteredPrices = allPrices.filter(price => !hiddenSet.has(price.symbol));
    
    return res.json({ symbols: filteredPrices });
  } catch (error) {
    return next(error);
  }
};

exports.candles = async (req, res, next) => {
  try {
    const rawSymbol = req.params[0] || req.params.symbol || '';
    const symbol = decodeURIComponent(rawSymbol);
    const timeframe = req.query.timeframe || '15m';
    const candles = await tradingView.getHistoricalCandles(symbol, timeframe, req.query.limit, { before: req.query.before });
    return res.json({ symbol, timeframe, candles });
  } catch (error) {
    return next(error);
  }
};
