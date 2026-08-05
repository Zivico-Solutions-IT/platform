const { spawn } = require('child_process');

const DEFAULT_TIMEFRAMES = '1m,3m,5m,15m,1H,4H,1D,1W,1M';

const dayId = (date) => (
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
);

const monthId = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const addDays = (date, days) => new Date(Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate() + days,
));

const runScript = (script, env) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [script], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });

  child.on('error', reject);
  child.on('exit', (code) => {
    if (code === 0) {
      resolve();
      return;
    }
    reject(new Error(`${script} exited with ${code}`));
  });
});

const run = async () => {
  const days = Math.max(1, Number(process.env.CATCHUP_DAYS || process.argv[2] || 7));
  const timeframes = process.env.CATCHUP_TIMEFRAMES || process.argv[3] || DEFAULT_TIMEFRAMES;
  const toDate = new Date();
  const fromDate = addDays(toDate, -days);
  const fromDay = process.env.CATCHUP_FROM || dayId(fromDate);
  const toDay = process.env.CATCHUP_TO || dayId(toDate);
  const fromMonth = monthId(new Date(`${fromDay}T00:00:00.000Z`));
  const toMonth = monthId(new Date(`${toDay}T00:00:00.000Z`));
  const skipExisting = process.env.CATCHUP_SKIP_EXISTING === 'true' ? 'true' : 'false';

  console.log(`Catching up candles: ${fromDay}..${toDay}`);

  await runScript('src/scripts/importBinanceCandles.js', {
    BINANCE_IMPORT_PAIRS: process.env.CATCHUP_CRYPTO_PAIRS || 'app-crypto',
    BINANCE_IMPORT_TIMEFRAMES: timeframes,
    BINANCE_IMPORT_FROM: fromMonth,
    BINANCE_IMPORT_TO: toMonth,
    BINANCE_IMPORT_API_FROM: fromDay,
    BINANCE_IMPORT_API_TO: toDay,
    BINANCE_IMPORT_SKIP_EXISTING: skipExisting,
  });

  await runScript('src/scripts/importCoinbaseCandles.js', {
    COINBASE_IMPORT_PRODUCTS: process.env.CATCHUP_COINBASE_PRODUCTS || 'app-coinbase-crypto',
    COINBASE_IMPORT_TIMEFRAMES: timeframes,
    COINBASE_IMPORT_FROM: fromDay,
    COINBASE_IMPORT_TO: toDay,
  });

  await runScript('src/scripts/importDukascopyCandles.js', {
    DUKASCOPY_IMPORT_SYMBOLS: process.env.CATCHUP_FX_METAL_SYMBOLS || 'app-fx-metals',
    DUKASCOPY_IMPORT_TIMEFRAMES: timeframes,
    DUKASCOPY_IMPORT_FROM: fromDay,
    DUKASCOPY_IMPORT_TO: toDay,
    DUKASCOPY_IMPORT_SKIP_EXISTING: skipExisting,
  });

  await runScript('src/scripts/importDukascopyCandles.js', {
    DUKASCOPY_IMPORT_SYMBOLS: process.env.CATCHUP_OTHER_SYMBOLS || 'app-indices-energies',
    DUKASCOPY_IMPORT_TIMEFRAMES: timeframes,
    DUKASCOPY_IMPORT_FROM: fromDay,
    DUKASCOPY_IMPORT_TO: toDay,
    DUKASCOPY_IMPORT_SKIP_EXISTING: skipExisting,
  });

  await runScript('src/scripts/importYahooCandles.js', {
    YAHOO_IMPORT_SYMBOLS: process.env.CATCHUP_YAHOO_SYMBOLS || 'ESX/EUR,F40/EUR,FTS/GBP,HSI/HKD,IBX/EUR',
    YAHOO_IMPORT_TIMEFRAMES: timeframes,
    YAHOO_IMPORT_FROM: fromDay,
    YAHOO_IMPORT_TO: toDay,
  });
};

run().catch((error) => {
  console.error('Candle catch-up failed:', error.message);
  process.exitCode = 1;
});
