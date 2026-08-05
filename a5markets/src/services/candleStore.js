const Candle = require('../models/Candle');

const storageTimeframe = (timeframe) => String(timeframe).replace(/^(\d+)M$/, '$1mo');

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

const monthInterval = (timeframe) => {
  const match = String(timeframe).match(/^(\d+)M$/);
  return match ? Number(match[1]) : null;
};

const toChartCandle = (bar) => ({
  time: Number(bar.time),
  open: Number(bar.open),
  high: Number(bar.high),
  low: Number(bar.low),
  close: Number(bar.close),
});

const readCandles = async (symbol, timeframe, limit = 50000, range = {}) => {
  const where = { symbol, timeframe: storageTimeframe(timeframe) };
  if (Number.isFinite(range.from) || Number.isFinite(range.to)) {
    where.time = {};
    if (Number.isFinite(range.from)) where.time[require('sequelize').Op.gte] = range.from;
    if (Number.isFinite(range.to)) where.time[require('sequelize').Op.lt] = range.to;
  }

  const rows = await Candle.findAll({
    where,
    order: [['time', 'DESC']],
    limit: Math.max(1, Math.min(Number(limit) || 50000, 200000)),
    raw: true,
  });

  return rows.reverse().map(toChartCandle);
};

const saveCandles = async (symbol, timeframe, candles) => {
  const storedTimeframe = storageTimeframe(timeframe);
  const rows = candles
    .map((bar) => ({
      symbol,
      timeframe: storedTimeframe,
      time: Number(bar.time),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: Number(bar.volume || 0),
    }))
    .filter((bar) => (
      Number.isFinite(bar.time) &&
      Number.isFinite(bar.open) &&
      Number.isFinite(bar.high) &&
      Number.isFinite(bar.low) &&
      Number.isFinite(bar.close)
    ));

  if (!rows.length) return 0;

  await Candle.bulkCreate(rows, {
    updateOnDuplicate: ['open', 'high', 'low', 'close', 'volume', 'updatedAt'],
  });

  return rows.length;
};

const bucketTime = (time, timeframe) => {
  const months = monthInterval(timeframe);
  if (months) {
    const date = new Date(time * 1000);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const bucketMonth = Math.floor(month / months) * months;
    return Math.floor(Date.UTC(year, bucketMonth, 1) / 1000);
  }

  const seconds = TIMEFRAME_SECONDS[timeframe];
  if (!seconds) return time;
  return Math.floor(time / seconds) * seconds;
};

const aggregateCandles = (candles, timeframe) => {
  if (!TIMEFRAME_SECONDS[timeframe] && !monthInterval(timeframe)) return candles || [];
  if (!Array.isArray(candles) || candles.length === 0) return candles || [];

  const buckets = new Map();
  candles.forEach((bar) => {
    const time = Number(bar.time);
    const open = Number(bar.open);
    const high = Number(bar.high);
    const low = Number(bar.low);
    const close = Number(bar.close);
    const volume = Number(bar.volume || 0);
    if (![time, open, high, low, close].every(Number.isFinite)) return;

    const candleBucketTime = bucketTime(time, timeframe);
    const bucket = buckets.get(candleBucketTime);
    if (!bucket) {
      buckets.set(candleBucketTime, { time: candleBucketTime, open, high, low, close, volume });
      return;
    }

    bucket.high = Math.max(bucket.high, high);
    bucket.low = Math.min(bucket.low, low);
    bucket.close = close;
    bucket.volume += Number.isFinite(volume) ? volume : 0;
  });

  return [...buckets.values()].sort((a, b) => a.time - b.time);
};

const candlesAlignWithTimeframe = (candles, timeframe) => {
  if (!TIMEFRAME_SECONDS[timeframe] && !monthInterval(timeframe)) return true;
  if (!Array.isArray(candles) || candles.length === 0) return true;
  return candles.every((bar) => Number(bar.time) === bucketTime(Number(bar.time), timeframe));
};

module.exports = {
  aggregateCandles,
  bucketTime,
  candlesAlignWithTimeframe,
  readCandles,
  saveCandles,
  storageTimeframe,
};
