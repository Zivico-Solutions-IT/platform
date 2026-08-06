require('dotenv').config({ quiet: true });

const axios = require('axios');
const sequelize = require('../config/db');
require('../models');
const { aggregateCandles, readCandles, saveCandles } = require('../services/candleStore');
const tradingView = require('../services/tradingViewService');

const COINBASE_API = 'https://api.exchange.coinbase.com/products';
const DEFAULT_TIMEFRAMES = '1m,3m,5m,15m,1H,4H,1D,1W,1M';
const MAX_CANDLES_PER_REQUEST = 300;
const LOG_EMPTY_CHUNKS = process.env.COINBASE_IMPORT_LOG_EMPTY === 'true';

const PRODUCT_IMPORT_START = {
  'BCH-EUR': '2017-12-20',
  'BCH-GBP': '2017-12-20',
};

const TIMEFRAME_TO_COINBASE = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1H': 3600,
  '1D': 86400,
};

const DERIVED_TIMEFRAME_SOURCES = {
  '3m': '1m',
  '4H': '1H',
  '1W': '1D',
  '1M': '1D',
};

const csv = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const dayId = (date) => (
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
);

const timestampId = (date) => `${dayId(date)} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;

const addSeconds = (date, seconds) => new Date(date.getTime() + seconds * 1000);

const unix = (date) => Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 1000);

const laterDate = (left, right) => (new Date(`${left}T00:00:00.000Z`) > new Date(`${right}T00:00:00.000Z`) ? left : right);

const appCoinbaseProducts = () => tradingView.instruments
  .filter((item) => item.group === 'CRYPTO CFD' && item.ticker.startsWith('COINBASE:'))
  .map((item) => {
    const [, compact] = item.ticker.split(':');
    const match = compact.match(/^([A-Z0-9]+)(EUR|GBP|USD)$/);
    return {
      product: match ? `${match[1]}-${match[2]}` : compact,
      symbol: item.symbol,
    };
  });

const symbolFromProduct = (product) => product.replace('-', '/');

const productRequests = (requested) => {
  if (requested === 'app-coinbase-crypto') return appCoinbaseProducts();
  return csv(requested).map((product) => ({ product, symbol: symbolFromProduct(product) }));
};

const dateChunks = (from, to, granularity) => {
  const chunks = [];
  let cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  const chunkSeconds = granularity * MAX_CANDLES_PER_REQUEST;

  while (cursor < end) {
    const chunkEnd = addSeconds(cursor, chunkSeconds);
    chunks.push([new Date(cursor), chunkEnd < end ? chunkEnd : end]);
    cursor = chunkEnd;
  }

  return chunks;
};

const parseCoinbaseCandles = (rows) => rows.map((cols) => ({
  time: Number(cols[0]),
  low: Number(cols[1]),
  high: Number(cols[2]),
  open: Number(cols[3]),
  close: Number(cols[4]),
  volume: Number(cols[5] || 0),
})).filter((bar) => (
  Number.isFinite(bar.time) &&
  Number.isFinite(bar.open) &&
  Number.isFinite(bar.high) &&
  Number.isFinite(bar.low) &&
  Number.isFinite(bar.close)
)).sort((a, b) => a.time - b.time);

const fetchCoinbaseCandles = async (product, granularity, fromDate, toDate) => {
  const response = await axios.get(`${COINBASE_API}/${encodeURIComponent(product)}/candles`, {
    timeout: 20000,
    headers: { 'User-Agent': 'A5Markets' },
    params: {
      granularity,
      start: fromDate.toISOString(),
      end: toDate.toISOString(),
    },
    validateStatus: (status) => status === 200 || status === 404,
  });

  if (response.status === 404) return [];
  return parseCoinbaseCandles(response.data || []);
};

const importNativeTimeframe = async (product, symbol, timeframe, from, to) => {
  const granularity = TIMEFRAME_TO_COINBASE[timeframe];
  if (!granularity) return null;

  let total = 0;
  let emptyChunks = 0;
  for (const [chunkFrom, chunkTo] of dateChunks(from, to, granularity)) {
    try {
      const candles = await fetchCoinbaseCandles(product, granularity, chunkFrom, chunkTo);
      const saved = await saveCandles(symbol, timeframe, candles);
      total += saved;
      if (candles.length || LOG_EMPTY_CHUNKS) {
        console.log(`${product} ${timeframe} ${timestampId(chunkFrom)}..${timestampId(chunkTo)}: rows=${candles.length} saved=${saved}`);
      } else {
        emptyChunks += 1;
      }
    } catch (error) {
      console.warn(`${product} ${timeframe} ${timestampId(chunkFrom)}..${timestampId(chunkTo)}: ${error.message}`);
    }
  }
  if (emptyChunks) console.log(`${product} ${timeframe}: skipped ${emptyChunks} empty chunks`);

  return total;
};

const importDerivedTimeframe = async (symbol, timeframe, from, to) => {
  const sourceTimeframe = DERIVED_TIMEFRAME_SOURCES[timeframe];
  if (!sourceTimeframe) return null;

  const range = {
    from: unix(from),
    to: unix(to) + 86400,
  };
  const sourceCandles = await readCandles(symbol, sourceTimeframe, 200000, range);
  const derived = aggregateCandles(sourceCandles, timeframe);
  const saved = await saveCandles(symbol, timeframe, derived);
  console.log(`${symbol} ${timeframe}: derived=${derived.length} from=${sourceTimeframe} saved=${saved}`);
  return saved;
};

const run = async () => {
  const requestedProducts = process.env.COINBASE_IMPORT_PRODUCTS || process.argv[2] || 'app-coinbase-crypto';
  const products = productRequests(requestedProducts);
  const timeframes = csv(process.env.COINBASE_IMPORT_TIMEFRAMES || process.argv[3] || DEFAULT_TIMEFRAMES);
  const from = process.env.COINBASE_IMPORT_FROM || process.argv[4] || '2026-04-01';
  const to = process.env.COINBASE_IMPORT_TO || process.argv[5] || new Date().toISOString().slice(0, 10);

  await sequelize.authenticate();
  await sequelize.sync();

  console.log(`Importing Coinbase candles: products=${products.map((item) => item.product).join(',')} timeframes=${timeframes.join(',')} days=${from}..${to}`);

  for (const { product, symbol } of products) {
    const effectiveFrom = PRODUCT_IMPORT_START[product] ? laterDate(from, PRODUCT_IMPORT_START[product]) : from;
    if (effectiveFrom !== from) {
      console.log(`${product}: clamped import start ${from} -> ${effectiveFrom}`);
    }
    if (new Date(`${effectiveFrom}T00:00:00.000Z`) > new Date(`${to}T23:59:59.999Z`)) {
      console.log(`${product}: skipped, requested range ends before product start`);
      continue;
    }

    for (const timeframe of timeframes) {
      const derived = await importDerivedTimeframe(symbol, timeframe, effectiveFrom, to);
      if (derived != null) continue;

      const native = await importNativeTimeframe(product, symbol, timeframe, effectiveFrom, to);
      if (native == null) {
        console.log(`${product} ${timeframe}: no Coinbase granularity`);
      }
    }
  }
};

run()
  .catch((error) => {
    console.error('Coinbase candle import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
