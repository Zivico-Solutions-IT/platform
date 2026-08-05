require('dotenv').config({ quiet: true });

const axios = require('axios');
const lzma = require('lzma-native');
const sequelize = require('../config/db');
require('../models');
const { aggregateCandles, readCandles, saveCandles } = require('../services/candleStore');
const tradingView = require('../services/tradingViewService');

const DUKASCOPY_FEED = 'https://datafeed.dukascopy.com/datafeed';
const DEFAULT_TIMEFRAMES = '1m,3m,5m,15m,1H,4H,1D,1W,1M';
const DAY_TIMEFRAMES = new Set(['3m', '5m', '15m', '30m', '1H', '2H', '3H', '4H', '6H', '8H', '12H', '1D']);
const RANGE_TIMEFRAMES = new Set(['1W', '1M']);
const REQUEST_TIMEOUT_MS = Number(process.env.DUKASCOPY_REQUEST_TIMEOUT_MS || 30000);
const REQUEST_RETRIES = Number(process.env.DUKASCOPY_REQUEST_RETRIES || 3);

const DUKASCOPY_TICKER_OVERRIDES = {
  'ASX/AUD': 'AUSIDXAUD',
  'DAX/EUR': 'DEUIDXEUR',
  'DJI/USD': 'USA30IDXUSD',
  'NDX/USD': 'USATECHIDXUSD',
  'NIK/JPY': 'JPNIDXJPY',
  'SPX/USD': 'USA500IDXUSD',
  'BRN/USD': 'BRENTCMDUSD',
  'NGC/USD': 'GASCMDUSD',
  'WTI/USD': 'LIGHTCMDUSD',
};

const csv = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const pad2 = (value) => String(value).padStart(2, '0');

const dayId = (date) => (
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
);

const addDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));

const daysBetween = (from, to) => {
  const days = [];
  let cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = addDay(cursor);
  }

  return days;
};

const dayBounds = (date) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = addDay(start);
  return {
    from: Math.floor(start.getTime() / 1000),
    to: Math.floor(end.getTime() / 1000),
  };
};

const compactSymbol = (symbol) => symbol.replace('/', '');

const dukascopyTickerFor = (symbol) => DUKASCOPY_TICKER_OVERRIDES[symbol] || compactSymbol(symbol);

const appFxMetalSymbols = () => tradingView.instruments
  .filter((item) => ['FOREX', 'METALS'].includes(item.group))
  .map((item) => item.symbol);

const appCfdSymbols = () => tradingView.instruments
  .filter((item) => ['INDICES', 'ENERGIES'].includes(item.group) && DUKASCOPY_TICKER_OVERRIDES[item.symbol])
  .map((item) => item.symbol);

const priceScaleFor = (symbol) => {
  if (DUKASCOPY_TICKER_OVERRIDES[symbol]) return 1000;
  const compact = compactSymbol(symbol);
  if (compact.includes('JPY')) return 1000;
  if (compact.startsWith('XAU') || compact.startsWith('XAG') || compact.startsWith('XPD') || compact.startsWith('XPT')) return 1000;
  return 100000;
};

const dukascopyUrl = (symbol, date, hour) => {
  const ticker = dukascopyTickerFor(symbol);
  const year = date.getUTCFullYear();
  const zeroBasedMonth = pad2(date.getUTCMonth());
  const day = pad2(date.getUTCDate());
  return `${DUKASCOPY_FEED}/${ticker}/${year}/${zeroBasedMonth}/${day}/${pad2(hour)}h_ticks.bi5`;
};

const parseTickBuffer = (buffer, date, hour, symbol) => {
  const scale = priceScaleFor(symbol);
  const hourStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour) / 1000;
  const candles = new Map();

  for (let offset = 0; offset + 20 <= buffer.length; offset += 20) {
    const millisecond = buffer.readInt32BE(offset);
    const ask = buffer.readInt32BE(offset + 4) / scale;
    const bid = buffer.readInt32BE(offset + 8) / scale;
    const price = (ask + bid) / 2;
    if (!Number.isFinite(price) || price <= 0) continue;

    const time = Math.floor((hourStart * 1000 + millisecond) / 60000) * 60;
    const candle = candles.get(time);
    if (!candle) {
      candles.set(time, { time, open: price, high: price, low: price, close: price, volume: 0 });
      continue;
    }

    candle.high = Math.max(candle.high, price);
    candle.low = Math.min(candle.low, price);
    candle.close = price;
  }

  return [...candles.values()].sort((a, b) => a.time - b.time);
};

const downloadHourCandles = async (symbol, date, hour) => {
  const url = dukascopyUrl(symbol, date, hour);
  let response = null;
  let lastError = null;

  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt++) {
    try {
      response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: (status) => status === 200 || status === 404,
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt === REQUEST_RETRIES) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  if (response.status === 404 || !response.data?.byteLength) return [];

  const decompressed = await lzma.decompress(Buffer.from(response.data));
  return parseTickBuffer(Buffer.from(decompressed), date, hour, symbol);
};

const downloadDayCandles = async (symbol, date) => {
  const candles = [];

  for (let hour = 0; hour < 24; hour++) {
    try {
      candles.push(...await downloadHourCandles(symbol, date, hour));
    } catch (error) {
      console.warn(`${symbol} ${dayId(date)} ${pad2(hour)}h: ${error.message}`);
    }
  }

  return candles;
};

const hasStoredDay = async (symbol, timeframe, date) => {
  const rows = await readCandles(symbol, timeframe, 1, dayBounds(date));
  return rows.length > 0;
};

const readDayCandles = (symbol, timeframe, date, limit = 2000) => readCandles(symbol, timeframe, limit, dayBounds(date));

const deriveAndSaveDayFrames = async (symbol, date, oneMinuteCandles, timeframes) => {
  for (const timeframe of timeframes) {
    if (!DAY_TIMEFRAMES.has(timeframe)) continue;
    const derived = aggregateCandles(oneMinuteCandles, timeframe);
    const saved = await saveCandles(symbol, timeframe, derived);
    console.log(`${symbol} ${timeframe} ${dayId(date)}: derived=${derived.length} saved=${saved}`);
  }
};

const deriveAndSaveRangeFrames = async (symbol, timeframes, from, to) => {
  const requested = timeframes.filter((timeframe) => RANGE_TIMEFRAMES.has(timeframe));
  if (!requested.length) return;

  const start = Math.floor(new Date(`${from}T00:00:00.000Z`).getTime() / 1000);
  const end = Math.floor(addDay(new Date(`${to}T00:00:00.000Z`)).getTime() / 1000);
  const daily = await readCandles(symbol, '1D', 200000, { from: start, to: end });

  for (const timeframe of requested) {
    const derived = aggregateCandles(daily, timeframe);
    const saved = await saveCandles(symbol, timeframe, derived);
    console.log(`${symbol} ${timeframe}: derived=${derived.length} saved=${saved}`);
  }
};

const run = async () => {
  const requestedSymbols = process.env.DUKASCOPY_IMPORT_SYMBOLS || process.argv[2] || 'EUR/USD,XAU/USD';
  const symbols = requestedSymbols === 'app-fx-metals'
    ? appFxMetalSymbols()
    : ['app-cfd', 'app-indices-energies'].includes(requestedSymbols)
      ? appCfdSymbols()
      : csv(requestedSymbols);
  if (requestedSymbols.startsWith('app-') && symbols.length === 1 && symbols[0] === requestedSymbols) {
    throw new Error(`Unknown Dukascopy symbol shortcut "${requestedSymbols}". Use app-fx-metals or app-indices-energies.`);
  }
  const timeframes = csv(process.env.DUKASCOPY_IMPORT_TIMEFRAMES || process.argv[3] || DEFAULT_TIMEFRAMES);
  const from = process.env.DUKASCOPY_IMPORT_FROM || process.argv[4] || dayId(addDay(new Date(Date.now() - 7 * 86400000)));
  const to = process.env.DUKASCOPY_IMPORT_TO || process.argv[5] || dayId(new Date());
  const skipExisting = process.env.DUKASCOPY_IMPORT_SKIP_EXISTING !== 'false';

  await sequelize.authenticate();
  await sequelize.sync();

  console.log(`Importing Dukascopy candles: symbols=${symbols.join(',')} timeframes=${timeframes.join(',')} days=${from}..${to}`);

  for (const symbol of symbols) {
    for (const date of daysBetween(from, to)) {
      let oneMinuteCandles = [];

      if (skipExisting && await hasStoredDay(symbol, '1m', date)) {
        oneMinuteCandles = await readDayCandles(symbol, '1m', date);
        console.log(`${symbol} 1m ${dayId(date)}: already stored rows=${oneMinuteCandles.length}`);
      } else {
        oneMinuteCandles = await downloadDayCandles(symbol, date);
        const saved = await saveCandles(symbol, '1m', oneMinuteCandles);
        console.log(`${symbol} 1m ${dayId(date)}: rows=${oneMinuteCandles.length} saved=${saved}`);
      }

      if (oneMinuteCandles.length > 0) {
        await deriveAndSaveDayFrames(symbol, date, oneMinuteCandles, timeframes);
      }
    }

    await deriveAndSaveRangeFrames(symbol, timeframes, from, to);
  }
};

run()
  .catch((error) => {
    console.error('Dukascopy candle import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
