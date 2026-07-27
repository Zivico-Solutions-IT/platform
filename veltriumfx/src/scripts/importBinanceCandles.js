require('dotenv').config({ quiet: true });

const AdmZip = require('adm-zip');
const sequelize = require('../config/db');
require('../models');
const { aggregateCandles, readCandles, saveCandles } = require('../services/candleStore');
const tradingView = require('../services/tradingViewService');

const BINANCE_ARCHIVE = 'https://data.binance.vision/data/spot/monthly/klines';
const BINANCE_API = 'https://api.binance.com/api/v3/klines';
const BINANCE_REQUEST_TIMEOUT_MS = Number(process.env.BINANCE_REQUEST_TIMEOUT_MS || 30000);
const BINANCE_REQUEST_RETRIES = Number(process.env.BINANCE_REQUEST_RETRIES || 5);
const BINANCE_REQUEST_DELAY_MS = Number(process.env.BINANCE_REQUEST_DELAY_MS || 250);

const TIMEFRAME_TO_BINANCE = {
  '1s': '1s',
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1H': '1h',
  '2H': '2h',
  '4H': '4h',
  '6H': '6h',
  '8H': '8h',
  '12H': '12h',
  '1D': '1d',
  '3D': '3d',
  '1W': '1w',
  '1M': '1mo',
};

const TIMEFRAME_TO_BINANCE_API = {
  ...TIMEFRAME_TO_BINANCE,
  '1M': '1M',
};

const DERIVED_TIMEFRAME_SOURCES = {
  '3H': '1m',
  '3M': '1M',
  '6M': '1M',
  '12M': '1M',
};

const csv = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, options = {}) => {
  let lastError = null;

  for (let attempt = 1; attempt <= BINANCE_REQUEST_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BINANCE_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if ([418, 429, 500, 502, 503, 504].includes(response.status) && attempt < BINANCE_REQUEST_RETRIES) {
        lastError = new Error(`${response.status} ${response.statusText} ${url}`);
        await delay(1000 * attempt);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < BINANCE_REQUEST_RETRIES) {
        await delay(1000 * attempt);
        continue;
      }
    }
  }

  throw lastError;
};

const appCryptoPairs = () => tradingView.instruments
  .filter((item) => item.group === 'CRYPTO CFD' && item.ticker.startsWith('BINANCE:'))
  .map((item) => item.ticker.replace('BINANCE:', ''));

const monthId = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const addMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

const monthsBetween = (from, to) => {
  const months = [];
  let cursor = new Date(`${from}-01T00:00:00.000Z`);
  const end = new Date(`${to}-01T00:00:00.000Z`);

  while (cursor <= end) {
    months.push(monthId(cursor));
    cursor = addMonth(cursor);
  }

  return months;
};

const normalizeTimestamp = (value) => {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return null;
  if (timestamp > 1e15) return Math.floor(timestamp / 1000000);
  if (timestamp > 1e12) return Math.floor(timestamp / 1000);
  return timestamp;
};

const parseApiKlines = (rows) => rows.map((cols) => ({
  time: normalizeTimestamp(cols[0]),
  open: Number(cols[1]),
  high: Number(cols[2]),
  low: Number(cols[3]),
  close: Number(cols[4]),
  volume: Number(cols[5]),
})).filter((bar) => Object.values(bar).every(Number.isFinite));

const parseKlineCsv = (csvText) => (
  csvText
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(','))
    .filter((cols) => cols.length >= 6 && Number.isFinite(Number(cols[0])))
    .map((cols) => ({
      time: normalizeTimestamp(cols[0]),
      open: Number(cols[1]),
      high: Number(cols[2]),
      low: Number(cols[3]),
      close: Number(cols[4]),
      volume: Number(cols[5]),
    }))
    .filter((bar) => Object.values(bar).every(Number.isFinite))
);

const downloadMonthlyKlines = async (pair, interval, month) => {
  const url = `${BINANCE_ARCHIVE}/${pair}/${interval}/${pair}-${interval}-${month}.zip`;
  const response = await fetchWithRetry(url);

  if (response.status === 404) return { url, candles: [], missing: true };
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} ${url}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = new AdmZip(buffer);
  const entry = zip.getEntries().find((item) => item.entryName.endsWith('.csv'));
  if (!entry) return { url, candles: [] };

  return { url, candles: parseKlineCsv(entry.getData().toString('utf8')) };
};

const importRecentKlines = async (pair, symbol, timeframe, interval, from, to) => {
  let startTime = new Date(`${from}T00:00:00.000Z`).getTime();
  const endTime = new Date(`${to}T23:59:59.999Z`).getTime();
  let total = 0;

  while (startTime < endTime) {
    const url = `${BINANCE_API}?symbol=${encodeURIComponent(pair)}&interval=${encodeURIComponent(interval)}&startTime=${startTime}&endTime=${endTime}&limit=1000`;
    const response = await fetchWithRetry(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} ${url}`);

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) break;

    const candles = parseApiKlines(rows);
    const saved = await saveCandles(symbol, timeframe, candles);
    total += saved;
    console.log(`${pair} ${timeframe}: api rows=${candles.length} saved=${saved}`);

    const lastOpenTime = Number(rows[rows.length - 1]?.[0]);
    if (!Number.isFinite(lastOpenTime) || lastOpenTime <= startTime) break;
    startTime = lastOpenTime + 1;
    if (BINANCE_REQUEST_DELAY_MS > 0) await delay(BINANCE_REQUEST_DELAY_MS);
  }

  return total;
};

const monthBounds = (month) => {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = addMonth(start);
  return {
    from: Math.floor(start.getTime() / 1000),
    to: Math.floor(end.getTime() / 1000),
  };
};

const monthDateRange = (month) => {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = addMonth(start);
  const today = new Date();
  const cappedEnd = end > today ? today : new Date(end.getTime() - 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: cappedEnd.toISOString().slice(0, 10),
  };
};

const shouldFallbackToApi = (month) => {
  const currentMonth = monthId(new Date());
  return month >= currentMonth;
};

const hasStoredMonth = async (symbol, timeframe, month) => {
  const { from, to } = monthBounds(month);
  const rows = await readCandles(symbol, timeframe, 1, { from, to });
  return rows.length > 0;
};

const importDerivedTimeframe = async (symbol, timeframe) => {
  const sourceTimeframe = DERIVED_TIMEFRAME_SOURCES[timeframe];
  if (!sourceTimeframe) return null;

  const sourceCandles = await readCandles(symbol, sourceTimeframe, 200000);
  const derived = aggregateCandles(sourceCandles, timeframe);
  const saved = await saveCandles(symbol, timeframe, derived);
  return { sourceTimeframe, rows: derived.length, saved };
};

const symbolFromPair = (pair) => {
  if (pair.endsWith('USDT')) return `${pair.slice(0, -4)}/USD`;
  if (pair.endsWith('BUSD')) return `${pair.slice(0, -4)}/USD`;
  return pair;
};

const run = async () => {
  const requestedPairs = process.env.BINANCE_IMPORT_PAIRS || process.argv[2] || 'BTCUSDT';
  const pairs = requestedPairs === 'app-crypto' ? appCryptoPairs() : csv(requestedPairs);
  const timeframes = csv(process.env.BINANCE_IMPORT_TIMEFRAMES || process.argv[3] || '1m');
  const from = process.env.BINANCE_IMPORT_FROM || process.argv[4] || '2017-08';
  const to = process.env.BINANCE_IMPORT_TO || process.argv[5] || monthId(new Date());
  const skipExisting = process.env.BINANCE_IMPORT_SKIP_EXISTING !== 'false';
  const apiFrom = process.env.BINANCE_IMPORT_API_FROM || null;
  const apiTo = process.env.BINANCE_IMPORT_API_TO || null;

  await sequelize.authenticate();
  await sequelize.sync();

  console.log(`Importing Binance candles: pairs=${pairs.join(',')} timeframes=${timeframes.join(',')} months=${from}..${to}`);

  for (const pair of pairs) {
    const symbol = symbolFromPair(pair);

    for (const timeframe of timeframes) {
      const interval = TIMEFRAME_TO_BINANCE[timeframe] || timeframe;
      const apiInterval = TIMEFRAME_TO_BINANCE_API[timeframe] || timeframe;
      let total = 0;
      const derivedResult = await importDerivedTimeframe(symbol, timeframe);
      if (derivedResult) {
        console.log(`${symbol} ${timeframe}: derived ${derivedResult.rows} rows from ${derivedResult.sourceTimeframe}, saved=${derivedResult.saved}`);
        continue;
      }

      if (apiFrom && apiTo) {
        total = await importRecentKlines(pair, symbol, timeframe, apiInterval, apiFrom, apiTo);
        console.log(`${symbol} ${timeframe}: imported ${total} recent api rows`);
        continue;
      }

      for (const month of monthsBetween(from, to)) {
        try {
          if (skipExisting && await hasStoredMonth(symbol, timeframe, month)) {
            console.log(`${pair} ${timeframe} ${month}: already stored`);
            continue;
          }

          const { candles, missing } = await downloadMonthlyKlines(pair, interval, month);
          if (missing) {
            if (shouldFallbackToApi(month)) {
              const { from: apiMonthFrom, to: apiMonthTo } = monthDateRange(month);
              const saved = await importRecentKlines(pair, symbol, timeframe, apiInterval, apiMonthFrom, apiMonthTo);
              total += saved;
              console.log(`${pair} ${timeframe} ${month}: archive missing, api saved=${saved}`);
              continue;
            }

            console.log(`${pair} ${timeframe} ${month}: missing`);
            continue;
          }

          const saved = await saveCandles(symbol, timeframe, candles);
          total += saved;
          console.log(`${pair} ${timeframe} ${month}: rows=${candles.length} saved=${saved}`);
        } catch (error) {
          console.warn(`${pair} ${timeframe} ${month}: ${error.message}`);
        }
      }

      console.log(`${symbol} ${timeframe}: imported ${total} rows`);
    }
  }
};

run()
  .catch((error) => {
    console.error('Binance candle import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
