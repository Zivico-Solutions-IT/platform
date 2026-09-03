const { spawn } = require('child_process');

const DEFAULT_DAYS = 365;
const DEFAULT_TIMEFRAMES = '1m,3m,5m,15m,1H,4H,1D,1W,1M';

const dayId = (date) => date.toISOString().slice(0, 10);
const startOfUtcMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
const addUtcMonths = (date, months) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
const endOfUtcMonth = (date) => new Date(addUtcMonths(startOfUtcMonth(date), 1).getTime() - 1);

const runCatchup = (from, to, timeframes) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['src/scripts/catchupCandles.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CATCHUP_FROM: dayId(from),
      CATCHUP_TO: dayId(to),
      CATCHUP_TIMEFRAMES: timeframes,
      CATCHUP_SKIP_EXISTING: 'true',
    },
    stdio: 'inherit',
  });

  child.on('error', reject);
  child.on('exit', (code) => {
    if (code === 0) return resolve();
    return reject(new Error(`Candle batch ${dayId(from)}..${dayId(to)} exited with ${code}`));
  });
});

const run = async () => {
  // A command-line duration is intentional for named npm jobs (6m / 1y),
  // while the environment variable remains useful for scheduled deployments.
  const days = Math.max(1, Number(process.argv[2] || process.env.CANDLE_BACKFILL_DAYS || DEFAULT_DAYS));
  const timeframes = process.env.CANDLE_BACKFILL_TIMEFRAMES || process.argv[3] || DEFAULT_TIMEFRAMES;
  const requestedTo = process.env.CANDLE_BACKFILL_TO
    ? new Date(`${process.env.CANDLE_BACKFILL_TO}T00:00:00.000Z`)
    : new Date();
  const requestedFrom = process.env.CANDLE_BACKFILL_FROM
    ? new Date(`${process.env.CANDLE_BACKFILL_FROM}T00:00:00.000Z`)
    : new Date(requestedTo.getTime() - days * 86400000);

  if (Number.isNaN(requestedFrom.getTime()) || Number.isNaN(requestedTo.getTime()) || requestedFrom > requestedTo) {
    throw new Error('Invalid candle backfill date range');
  }

  console.log(`Candle backfill: ${dayId(requestedFrom)}..${dayId(requestedTo)} timeframes=${timeframes}`);

  let cursor = new Date(requestedFrom);
  while (cursor <= requestedTo) {
    const monthEnd = endOfUtcMonth(cursor);
    const batchTo = monthEnd < requestedTo ? monthEnd : requestedTo;
    console.log(`Starting candle batch ${dayId(cursor)}..${dayId(batchTo)}`);
    await runCatchup(cursor, batchTo, timeframes);
    cursor = new Date(batchTo.getTime() + 86400000);
  }

  console.log('Candle history backfill completed.');
};

run().catch((error) => {
  console.error('Candle history backfill failed:', error.message);
  process.exitCode = 1;
});
