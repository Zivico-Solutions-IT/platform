require('dotenv').config({ quiet: true });

const axios = require('axios');
const sequelize = require('../config/db');
require('../models');
const { aggregateCandles, readCandles, saveCandles } = require('../services/candleStore');
const tradingView = require('../services/tradingViewService');

const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';
const DEFAULT_TIMEFRAMES = '1m,3m,5m,15m,1H,4H,1D,1W,1M';

const SYMBOL_TO_YAHOO = {
  'ASX/AUD': '^AXJO',
  'DAX/EUR': '^GDAXI',
  'DJI/USD': '^DJI',
  'ESX/EUR': '^STOXX50E',
  'F40/EUR': '^FCHI',
  'FTS/GBP': '^FTSE',
  'HSI/HKD': '^HSI',
  'IBX/EUR': '^IBEX',
  'NDX/USD': '^NDX',
  'NIK/JPY': '^N225',
  'SPX/USD': '^GSPC',
  'WTI/USD': 'CL=F',
  'BRN/USD': 'BZ=F',
  'NGC/USD': 'NG=F',
};

const TIMEFRAME_TO_YAHOO = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1H': '60m',
  '1D': '1d',
  '1W': '1wk',
  '1M': '1mo',
};

const DERIVED_TIMEFRAME_SOURCES = {
  '3m': '1m',
  '4H': '1H',
};

const INTERVAL_MAX_DAYS = {
  '1m': 6,
  '5m': 59,
  '15m': 59,
  '1H': 729,
  '1D': 3650,
  '1W': 3650,
  '1M': 3650,
};

const csv = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const dayId = (date) => (
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
);

const addDays = (date, days) => new Date(Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate() + days,
));

const unix = (date) => Math.floor(date.getTime() / 1000);

const appOtherSymbols = () => tradingView.instruments
  .filter((item) => ['INDICES', 'ENERGIES'].includes(item.group) && SYMBOL_TO_YAHOO[item.symbol])
  .map((item) => item.symbol);

const dateChunks = (from, to, maxDays) => {
  const chunks = [];
  let cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  while (cursor <= end) {
    const chunkEnd = addDays(cursor, maxDays);
    const cappedEnd = chunkEnd < end ? chunkEnd : addDays(end, 1);
    chunks.push([new Date(cursor), cappedEnd]);
    cursor = cappedEnd;
  }

  return chunks;
};

const parseYahooCandles = (result) => {
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const adjclose = result?.indicators?.adjclose?.[0]?.adjclose || [];

  return timestamps.map((time, index) => {
    const open = Number(quote.open?.[index] ?? adjclose[index]);
    const high = Number(quote.high?.[index] ?? open);
    const low = Number(quote.low?.[index] ?? open);
    const close = Number(quote.close?.[index] ?? adjclose[index] ?? open);
    const volume = Number(quote.volume?.[index] || 0);

    return { time: Number(time), open, high, low, close, volume };
  }).filter((bar) => (
    Number.isFinite(bar.time) &&
    Number.isFinite(bar.open) &&
    Number.isFinite(bar.high) &&
    Number.isFinite(bar.low) &&
    Number.isFinite(bar.close)
  ));
};

const fetchYahooCandles = async (yahooSymbol, yahooInterval, fromDate, toDate) => {
  const url = `${YAHOO_CHART}/${encodeURIComponent(yahooSymbol)}`;
  const response = await axios.get(url, {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0' },
    params: {
      interval: yahooInterval,
      period1: unix(fromDate),
      period2: unix(toDate),
      includePrePost: false,
    },
    validateStatus: (status) => status === 200 || status === 404,
  });

  if (response.status === 404) return [];
  const error = response.data?.chart?.error;
  if (error) throw new Error(error.description || error.code || 'Yahoo chart error');
  return parseYahooCandles(response.data?.chart?.result?.[0]);
};

const importNativeTimeframe = async (symbol, timeframe, from, to) => {
  const yahooSymbol = SYMBOL_TO_YAHOO[symbol];
  const yahooInterval = TIMEFRAME_TO_YAHOO[timeframe];
  if (!yahooSymbol || !yahooInterval) return null;

  const maxDays = INTERVAL_MAX_DAYS[timeframe] || 59;
  let total = 0;

  for (const [chunkFrom, chunkTo] of dateChunks(from, to, maxDays)) {
    try {
      const candles = await fetchYahooCandles(yahooSymbol, yahooInterval, chunkFrom, chunkTo);
      const saved = await saveCandles(symbol, timeframe, candles);
      total += saved;
      console.log(`${symbol} ${timeframe} ${dayId(chunkFrom)}..${dayId(addDays(chunkTo, -1))}: rows=${candles.length} saved=${saved}`);
    } catch (error) {
      console.warn(`${symbol} ${timeframe} ${dayId(chunkFrom)}..${dayId(addDays(chunkTo, -1))}: ${error.message}`);
    }
  }

  return total;
};

const importDerivedTimeframe = async (symbol, timeframe, from, to) => {
  const sourceTimeframe = DERIVED_TIMEFRAME_SOURCES[timeframe];
  if (!sourceTimeframe) return null;

  const range = {
    from: unix(new Date(`${from}T00:00:00.000Z`)),
    to: unix(addDays(new Date(`${to}T00:00:00.000Z`), 1)),
  };
  const sourceCandles = await readCandles(symbol, sourceTimeframe, 200000, range);
  const derived = aggregateCandles(sourceCandles, timeframe);
  const saved = await saveCandles(symbol, timeframe, derived);
  console.log(`${symbol} ${timeframe}: derived=${derived.length} from=${sourceTimeframe} saved=${saved}`);
  return saved;
};

const run = async () => {
  const requestedSymbols = process.env.YAHOO_IMPORT_SYMBOLS || process.argv[2] || 'SPX/USD,WTI/USD';
  const symbols = requestedSymbols === 'app-indices-energies' ? appOtherSymbols() : csv(requestedSymbols);
  const timeframes = csv(process.env.YAHOO_IMPORT_TIMEFRAMES || process.argv[3] || DEFAULT_TIMEFRAMES);
  const from = process.env.YAHOO_IMPORT_FROM || process.argv[4] || dayId(addDays(new Date(), -30));
  const to = process.env.YAHOO_IMPORT_TO || process.argv[5] || dayId(new Date());

  await sequelize.authenticate();
  await sequelize.sync();

  console.log(`Importing Yahoo candles: symbols=${symbols.join(',')} timeframes=${timeframes.join(',')} days=${from}..${to}`);

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      const derived = await importDerivedTimeframe(symbol, timeframe, from, to);
      if (derived != null) continue;

      const native = await importNativeTimeframe(symbol, timeframe, from, to);
      if (native == null) {
        console.log(`${symbol} ${timeframe}: no Yahoo mapping`);
      }
    }
  }
};

run()
  .catch((error) => {
    console.error('Yahoo candle import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
