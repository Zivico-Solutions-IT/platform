require('dotenv').config({ quiet: true });

const axios = require('axios');
const sequelize = require('../config/db');
require('../models');
const { aggregateCandles, readCandles, saveCandles } = require('../services/candleStore');
const tradingView = require('../services/tradingViewService');

const STOOQ_DOWNLOAD = 'https://stooq.com/q/d/l/';
const DEFAULT_TIMEFRAMES = '1D,1W,1M';

const SYMBOL_TO_STOOQ = {
  'ASX/AUD': '^aord',
  'DAX/EUR': '^dax',
  'DJI/USD': '^dji',
  'ESX/EUR': '^sx5e',
  'F40/EUR': '^cac',
  'FTS/GBP': '^ukx',
  'HSI/HKD': '^hsi',
  'IBX/EUR': '^ibex',
  'NDX/USD': '^ndx',
  'NIK/JPY': '^nkx',
  'SPX/USD': '^spx',
  'WTI/USD': 'cl.f',
  'BRN/USD': 'br.f',
  'NGC/USD': 'ng.f',
};

const TIMEFRAME_TO_STOOQ = {
  '5m': '5',
  '15m': '15',
  '1H': '60',
  '1D': 'd',
};

const DERIVED_TIMEFRAME_SOURCES = {
  '3m': '5m',
  '4H': '1H',
  '1W': '1D',
  '1M': '1D',
};

const csv = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const appOtherSymbols = () => tradingView.instruments
  .filter((item) => ['INDICES', 'ENERGIES'].includes(item.group) && SYMBOL_TO_STOOQ[item.symbol])
  .map((item) => item.symbol);

const dateParam = (date) => String(date).replace(/-/g, '');

const unix = (date) => Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 1000);

const parseStooqDateTime = (date, time = '00:00:00') => {
  const [year, month, day] = String(date).split('-').map(Number);
  const [hour, minute, second] = String(time).split(':').map(Number);
  const timestamp = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0);
  return Math.floor(timestamp / 1000);
};

const parseStooqCsv = (text) => {
  if (!text || text.startsWith('Get your apikey')) {
    throw new Error('STOOQ_API_KEY is missing or invalid');
  }

  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1 || /No data/i.test(text)) return [];

  const headers = lines[0].split(',').map((item) => item.trim().toLowerCase());
  const indexOf = (name) => headers.indexOf(name);
  const dateIndex = indexOf('date');
  const timeIndex = indexOf('time');
  const openIndex = indexOf('open');
  const highIndex = indexOf('high');
  const lowIndex = indexOf('low');
  const closeIndex = indexOf('close');
  const volumeIndex = indexOf('volume');

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((item) => item.trim());
    const open = Number(cols[openIndex]);
    const high = Number(cols[highIndex]);
    const low = Number(cols[lowIndex]);
    const close = Number(cols[closeIndex]);
    const volume = Number(cols[volumeIndex] || 0);

    return {
      time: parseStooqDateTime(cols[dateIndex], timeIndex >= 0 ? cols[timeIndex] : '00:00:00'),
      open,
      high,
      low,
      close,
      volume,
    };
  }).filter((bar) => (
    Number.isFinite(bar.time) &&
    Number.isFinite(bar.open) &&
    Number.isFinite(bar.high) &&
    Number.isFinite(bar.low) &&
    Number.isFinite(bar.close)
  ));
};

const fetchStooqCandles = async (stooqSymbol, stooqInterval, from, to, apiKey) => {
  const response = await axios.get(STOOQ_DOWNLOAD, {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0' },
    params: {
      s: stooqSymbol,
      i: stooqInterval,
      d1: dateParam(from),
      d2: dateParam(to),
      apikey: apiKey,
    },
  });

  return parseStooqCsv(response.data);
};

const importNativeTimeframe = async (symbol, timeframe, from, to, apiKey) => {
  const stooqSymbol = SYMBOL_TO_STOOQ[symbol];
  const stooqInterval = TIMEFRAME_TO_STOOQ[timeframe];
  if (!stooqSymbol || !stooqInterval) return null;

  const candles = await fetchStooqCandles(stooqSymbol, stooqInterval, from, to, apiKey);
  const saved = await saveCandles(symbol, timeframe, candles);
  console.log(`${symbol} ${timeframe}: rows=${candles.length} saved=${saved}`);
  return saved;
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
  const apiKey = process.env.STOOQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'STOOQ_API_KEY is not configured. Open https://stooq.com/q/d/?s=^spx&get_apikey, complete captcha, then add STOOQ_API_KEY to backend/.env.'
    );
  }

  const requestedSymbols = process.env.STOOQ_IMPORT_SYMBOLS || process.argv[2] || 'SPX/USD,WTI/USD';
  const symbols = requestedSymbols === 'app-indices-energies' ? appOtherSymbols() : csv(requestedSymbols);
  const timeframes = csv(process.env.STOOQ_IMPORT_TIMEFRAMES || process.argv[3] || DEFAULT_TIMEFRAMES);
  const from = process.env.STOOQ_IMPORT_FROM || process.argv[4] || '2010-01-01';
  const to = process.env.STOOQ_IMPORT_TO || process.argv[5] || new Date().toISOString().slice(0, 10);

  await sequelize.authenticate();
  await sequelize.sync();

  console.log(`Importing Stooq candles: symbols=${symbols.join(',')} timeframes=${timeframes.join(',')} days=${from}..${to}`);

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      const derived = await importDerivedTimeframe(symbol, timeframe, from, to);
      if (derived != null) continue;

      const native = await importNativeTimeframe(symbol, timeframe, from, to, apiKey);
      if (native == null) {
        console.log(`${symbol} ${timeframe}: no Stooq mapping`);
      }
    }
  }
};

run()
  .catch((error) => {
    console.error('Stooq candle import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
