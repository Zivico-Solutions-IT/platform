const axios = require('axios');
const { aggregateCandles, readCandles, saveCandles } = require('./candleStore');

let lzma;
const getLzma = () => {
  if (!lzma) lzma = require('lzma-native');
  return lzma;
};

const BINANCE_API = 'https://api.binance.com/api/v3/klines';
const COINBASE_API = 'https://api.exchange.coinbase.com/products';
const DUKASCOPY_FEED = 'https://datafeed.dukascopy.com/datafeed';

const TIMEFRAME_SECONDS = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1H': 3600,
  '2H': 7200,
  '3H': 10800,
  '4H': 14400,
  '6H': 21600,
  '8H': 28800,
  '12H': 43200,
  '1D': 86400,
  '3D': 259200,
  '1W': 604800,
};

const TIMEFRAME_TO_BINANCE = {
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
  '1M': '1M',
};

const TIMEFRAME_TO_COINBASE = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1H': 3600,
  '1D': 86400,
};

const COINBASE_DERIVED_SOURCES = {
  '3m': '1m',
  '4H': '1H',
  '1W': '1D',
  '1M': '1D',
};

const DUKASCOPY_DAY_TIMEFRAMES = new Set(['3m', '5m', '15m', '30m', '1H', '2H', '3H', '4H', '6H', '8H', '12H', '1D']);
const DUKASCOPY_RANGE_TIMEFRAMES = new Set(['1W', '1M']);
const DUKASCOPY_RECENT_ENABLED = process.env.AUTO_CATCHUP_DUKASCOPY_ENABLED === 'true';
const DUKASCOPY_TIMEOUT_MS = Number(process.env.AUTO_CATCHUP_DUKASCOPY_TIMEOUT_MS || 15000);
const DUKASCOPY_RETRIES = Number(process.env.AUTO_CATCHUP_DUKASCOPY_RETRIES || 2);
const DUKASCOPY_LOGS_ENABLED = process.env.AUTO_CATCHUP_LOGS_ENABLED === 'true';
const DUKASCOPY_HOUR_CACHE_MS = Math.max(30000, Number(process.env.DUKASCOPY_HOUR_CACHE_MS || 5 * 60000));
const DUKASCOPY_HOUR_ERROR_CACHE_MS = Math.max(30000, Number(process.env.DUKASCOPY_HOUR_ERROR_CACHE_MS || 2 * 60000));
const dukascopyHourCache = new Map();

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

const pad2 = (value) => String(value).padStart(2, '0');

const dayId = (date) => (
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
);

const addDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));

const startOfUtcDay = (timestampSeconds) => {
  const date = new Date(timestampSeconds * 1000);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const daysBetweenTimestamps = (from, to) => {
  const days = [];
  let cursor = startOfUtcDay(from);
  const end = startOfUtcDay(to);

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

const hourSlotsBetweenTimestamps = (from, to) => {
  const slots = [];
  const start = new Date(Math.floor(from / 3600) * 3600 * 1000);
  const end = new Date(Math.ceil(to / 3600) * 3600 * 1000);
  let cursor = start;

  while (cursor < end) {
    slots.push({
      date: new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate())),
      hour: cursor.getUTCHours(),
    });
    cursor = new Date(cursor.getTime() + 3600000);
  }

  return slots;
};

const normalizeTimestamp = (value) => {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return null;
  if (timestamp > 1e15) return Math.floor(timestamp / 1000000);
  if (timestamp > 1e12) return Math.floor(timestamp / 1000);
  return timestamp;
};

const parseBinanceKlines = (rows) => rows.map((cols) => ({
  time: normalizeTimestamp(cols[0]),
  open: Number(cols[1]),
  high: Number(cols[2]),
  low: Number(cols[3]),
  close: Number(cols[4]),
  volume: Number(cols[5] || 0),
})).filter((bar) => Object.values(bar).every(Number.isFinite));

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

const binancePair = (instrument) => instrument.ticker.replace('BINANCE:', '');

const coinbaseProduct = (instrument) => {
  const compact = instrument.ticker.replace('COINBASE:', '');
  const match = compact.match(/^([A-Z0-9]+)(EUR|GBP|USD)$/);
  return match ? `${match[1]}-${match[2]}` : compact;
};

async function fetchBinanceRecent(instrument, timeframe, from, to, options = {}) {
  const interval = TIMEFRAME_TO_BINANCE[timeframe];
  if (!interval) return [];

  const pair = binancePair(instrument);
  let startTime = from * 1000;
  const endTime = to * 1000;
  const allCandles = [];

  while (startTime < endTime) {
    const response = await fetch(`${BINANCE_API}?symbol=${encodeURIComponent(pair)}&interval=${encodeURIComponent(interval)}&startTime=${startTime}&endTime=${endTime}&limit=1000`);
    if (!response.ok) throw new Error(`Binance ${pair} ${timeframe} ${response.status}`);

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) break;

    const candles = parseBinanceKlines(rows);
    allCandles.push(...candles);

    const lastOpenTime = Number(rows[rows.length - 1]?.[0]);
    if (!Number.isFinite(lastOpenTime) || lastOpenTime <= startTime) break;
    startTime = lastOpenTime + 1;
  }

  if (options.save && allCandles.length) {
    await saveCandles(instrument.symbol, timeframe, allCandles);
  }

  return allCandles;
}

async function fetchCoinbaseNative(product, symbol, timeframe, granularity, from, to, options = {}) {
  let cursor = from;
  const maxSeconds = granularity * 300;
  const allCandles = [];

  while (cursor < to) {
    const chunkTo = Math.min(to, cursor + maxSeconds);
    const response = await axios.get(`${COINBASE_API}/${encodeURIComponent(product)}/candles`, {
      timeout: 20000,
      headers: { 'User-Agent': 'NovaFXM' },
      params: {
        granularity,
        start: new Date(cursor * 1000).toISOString(),
        end: new Date(chunkTo * 1000).toISOString(),
      },
      validateStatus: (status) => status === 200 || status === 404,
    });

    if (response.status === 200) {
      const candles = parseCoinbaseCandles(response.data || []);
      allCandles.push(...candles);
    }

    cursor = chunkTo;
  }

  if (options.save && allCandles.length) {
    await saveCandles(symbol, timeframe, allCandles);
  }

  return allCandles;
}

async function fetchCoinbaseRecent(instrument, timeframe, from, to, options = {}) {
  const product = coinbaseProduct(instrument);
  const nativeGranularity = TIMEFRAME_TO_COINBASE[timeframe];
  if (nativeGranularity) {
    return fetchCoinbaseNative(product, instrument.symbol, timeframe, nativeGranularity, from, to, options);
  }

  const sourceTimeframe = COINBASE_DERIVED_SOURCES[timeframe];
  const sourceGranularity = TIMEFRAME_TO_COINBASE[sourceTimeframe];
  if (!sourceTimeframe || !sourceGranularity) return [];

  const sourceCandles = await fetchCoinbaseNative(product, instrument.symbol, sourceTimeframe, sourceGranularity, from, to, options.save ? { save: true } : {});
  const derived = aggregateCandles(sourceCandles, timeframe);
  if (options.save && derived.length) {
    await saveCandles(instrument.symbol, timeframe, derived);
  }
  return derived;
}

const compactSymbol = (symbol) => symbol.replace('/', '');
const dukascopyTickerFor = (symbol) => DUKASCOPY_TICKER_OVERRIDES[symbol] || compactSymbol(symbol);

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

const parseDukascopyTicks = (buffer, date, hour, symbol) => {
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

async function fetchDukascopyHourRaw(symbol, date, hour) {
  const url = dukascopyUrl(symbol, date, hour);
  let lastError = null;

  for (let attempt = 1; attempt <= DUKASCOPY_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: DUKASCOPY_TIMEOUT_MS,
        validateStatus: (status) => status === 200 || status === 404,
      });
      if (response.status === 404 || !response.data?.byteLength) return [];

      const decompressed = await getLzma().decompress(Buffer.from(response.data));
      return parseDukascopyTicks(Buffer.from(decompressed), date, hour, symbol);
    } catch (error) {
      lastError = error;
      if (attempt < DUKASCOPY_RETRIES) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  throw lastError;
}

async function fetchDukascopyHour(symbol, date, hour) {
  const key = `${symbol}:${dayId(date)}:${pad2(hour)}`;
  const cached = dukascopyHourCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    if (cached.error) return [];
    return cached.promise || cached.candles || [];
  }

  const promise = fetchDukascopyHourRaw(symbol, date, hour)
    .then((candles) => {
      dukascopyHourCache.set(key, {
        candles,
        expiresAt: Date.now() + DUKASCOPY_HOUR_CACHE_MS,
      });
      return candles;
    })
    .catch((error) => {
      dukascopyHourCache.set(key, {
        error: error.message,
        candles: [],
        expiresAt: Date.now() + DUKASCOPY_HOUR_ERROR_CACHE_MS,
      });
      throw error;
    });

  dukascopyHourCache.set(key, {
    promise,
    expiresAt: Date.now() + DUKASCOPY_HOUR_CACHE_MS,
  });

  return promise;
}

async function fetchDukascopyDay(symbol, date) {
  const candles = [];

  for (let hour = 0; hour < 24; hour++) {
    try {
      candles.push(...await fetchDukascopyHour(symbol, date, hour));
    } catch (error) {
      if (DUKASCOPY_LOGS_ENABLED) {
        console.warn(`Auto candle catch-up ${symbol} ${dayId(date)} ${pad2(hour)}h: ${error.message}`);
      }
    }
  }

  return candles;
}

async function fetchDukascopyRecent(instrument, timeframe, from, to, options = {}) {
  if (!DUKASCOPY_DAY_TIMEFRAMES.has(timeframe) && !DUKASCOPY_RANGE_TIMEFRAMES.has(timeframe) && timeframe !== '1m') {
    return [];
  }

  const allCandles = [];
  const minuteCandlesByDay = new Map();

  if (DUKASCOPY_RANGE_TIMEFRAMES.has(timeframe)) {
    for (const date of daysBetweenTimestamps(from, to)) {
      const dayCandles = await fetchDukascopyDay(instrument.symbol, date);
      if (dayCandles.length) minuteCandlesByDay.set(dayId(date), dayCandles);
    }
  } else {
    const candles = [];
    for (const { date, hour } of hourSlotsBetweenTimestamps(from, to)) {
      try {
        candles.push(...await fetchDukascopyHour(instrument.symbol, date, hour));
      } catch (error) {
        if (DUKASCOPY_LOGS_ENABLED) {
          console.warn(`Auto candle catch-up ${instrument.symbol} ${dayId(date)} ${pad2(hour)}h: ${error.message}`);
        }
      }
    }

    candles
      .filter((bar) => Number(bar.time) >= from && Number(bar.time) <= to)
      .forEach((bar) => {
        const date = startOfUtcDay(bar.time);
        const key = dayId(date);
        const group = minuteCandlesByDay.get(key) || [];
        group.push(bar);
        minuteCandlesByDay.set(key, group);
      });
  }

  for (const [dateKey, candles] of minuteCandlesByDay.entries()) {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    const bounds = dayBounds(date);
    const oneMinuteCandles = candles.sort((a, b) => Number(a.time) - Number(b.time));
    if (!oneMinuteCandles.length) continue;

    if (options.save) {
      await saveCandles(instrument.symbol, '1m', oneMinuteCandles);
    }

    if (timeframe === '1m') {
      allCandles.push(...oneMinuteCandles);
      continue;
    }

    if (DUKASCOPY_DAY_TIMEFRAMES.has(timeframe)) {
      const derived = aggregateCandles(oneMinuteCandles, timeframe);
      if (options.save && derived.length) {
        await saveCandles(instrument.symbol, timeframe, derived);
      }
      allCandles.push(...derived);
      continue;
    }

    if (DUKASCOPY_RANGE_TIMEFRAMES.has(timeframe)) {
      const daily = await readCandles(instrument.symbol, '1D', 200000, bounds);
      const derived = aggregateCandles(daily.length ? daily : aggregateCandles(oneMinuteCandles, '1D'), timeframe);
      if (options.save && derived.length) {
        await saveCandles(instrument.symbol, timeframe, derived);
      }
      allCandles.push(...derived);
    }
  }

  return allCandles;
}

async function fetchRecentCandles(instrument, timeframe, from, to, options = {}) {
  if (!instrument || timeframe === '1s' || !Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
    return [];
  }

  if (instrument.ticker.startsWith('BINANCE:')) {
    return fetchBinanceRecent(instrument, timeframe, from, to, options);
  }

  if (instrument.ticker.startsWith('COINBASE:')) {
    return fetchCoinbaseRecent(instrument, timeframe, from, to, options);
  }

  if (['FOREX', 'METALS', 'INDICES', 'ENERGIES'].includes(instrument.group)) {
    if (!options.save && !DUKASCOPY_RECENT_ENABLED) return [];
    return fetchDukascopyRecent(instrument, timeframe, from, to, options);
  }

  return [];
}

async function ensureRecentCandles(instrument, timeframe, from, to) {
  const candles = await fetchRecentCandles(instrument, timeframe, from, to, { save: true });
  return candles.length;
}

module.exports = {
  ensureRecentCandles,
  fetchRecentCandles,
  timeframeSeconds: (timeframe) => TIMEFRAME_SECONDS[timeframe] || (String(timeframe).endsWith('M') ? 2592000 : null),
};
