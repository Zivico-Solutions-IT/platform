const { spawn } = require('child_process');
const path = require('path');

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INITIAL_DELAY_MS = 2 * 60 * 1000;

const toPositiveNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const delayUntilTimeOfDay = (timeOfDay) => {
  const match = String(timeOfDay || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
};

function startCandleCatchupScheduler() {
  if (process.env.AUTO_CANDLE_CATCHUP_ENABLED !== 'true') {
    return () => {};
  }

  const backendRoot = path.resolve(__dirname, '../..');
  const scriptPath = path.join(backendRoot, 'src/scripts/catchupCandles.js');
  const intervalMs = toPositiveNumber(process.env.AUTO_CANDLE_CATCHUP_INTERVAL_MS, DEFAULT_INTERVAL_MS);
  const initialDelayMs = delayUntilTimeOfDay(process.env.AUTO_CANDLE_CATCHUP_AT)
    ?? toPositiveNumber(process.env.AUTO_CANDLE_CATCHUP_INITIAL_DELAY_MS, DEFAULT_INITIAL_DELAY_MS);
  let timer = null;
  let isRunning = false;
  let stopped = false;

  const runCatchup = () => {
    if (stopped || isRunning) return;

    isRunning = true;
    const startedAt = new Date();
    console.log(`[${startedAt.toISOString()}] Starting scheduled candle catch-up`);

    const child = spawn(process.execPath, [scriptPath], {
      cwd: backendRoot,
      env: {
        ...process.env,
        CATCHUP_DAYS: process.env.AUTO_CANDLE_CATCHUP_DAYS || process.env.CATCHUP_DAYS || '2',
        CATCHUP_TIMEFRAMES: process.env.AUTO_CANDLE_CATCHUP_TIMEFRAMES || process.env.CATCHUP_TIMEFRAMES || '1m,3m,5m,15m,1H,4H,1D,1W,1M',
      },
      stdio: 'inherit',
      windowsHide: true,
    });

    child.on('error', (error) => {
      console.warn('Scheduled candle catch-up failed to start:', error.message);
      isRunning = false;
    });

    child.on('exit', (code) => {
      const finishedAt = new Date();
      const seconds = Math.round((finishedAt - startedAt) / 1000);
      if (code === 0) {
        console.log(`[${finishedAt.toISOString()}] Scheduled candle catch-up finished in ${seconds}s`);
      } else {
        console.warn(`[${finishedAt.toISOString()}] Scheduled candle catch-up exited with ${code} after ${seconds}s`);
      }
      isRunning = false;
    });
  };

  timer = setTimeout(() => {
    runCatchup();
    timer = setInterval(runCatchup, intervalMs);
  }, initialDelayMs);

  console.log(`Scheduled candle catch-up enabled: every ${Math.round(intervalMs / 60000)} minutes, first run in ${Math.round(initialDelayMs / 60000)} minutes`);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    if (timer) clearTimeout(timer);
  };
}

module.exports = { startCandleCatchupScheduler };
