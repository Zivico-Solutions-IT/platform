const startupStartedAt = Date.now();

const fatal = (type, error) => {
  console.error(`[fatal] ${type}:`, error?.stack || error);
  process.exit(1);
};
process.on('uncaughtException', (error) => fatal('uncaughtException', error));
process.on('unhandledRejection', (error) => fatal('unhandledRejection', error));

console.log(`[startup] Booting VeltriumFX API; node=${process.version}; pid=${process.pid}`);

const { validateEnvironment, environmentSummary, isMasterEnabled } = require('./config/env');
console.log('[startup] Environment summary:', JSON.stringify(environmentSummary()));
console.log('[startup] Loading Express and HTTP dependencies.');
const express = require('express');
const cors = require('cors');
const http = require('http');
const zlib = require('zlib');
const { Server } = require('socket.io');
console.log('[startup] Express and HTTP dependencies loaded.');
console.log('[startup] Loading database models.');
const sequelize = require('./config/db');
require('./models');
const ensureSchema = require('./config/ensureSchema');
console.log('[startup] Database models loaded.');
console.log('[startup] Loading market runtime services.');
const tradingView = require('./services/tradingViewService');
const { startCandleCatchupScheduler } = require('./services/candleCatchupScheduler');
const { processTradeTriggers } = require('./services/tradeAutomationService');
console.log('[startup] Market runtime services loaded.');
//
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const allowedOrigins = String(process.env.CORS_ORIGIN || 'https://novafxm.com')  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
const allowAnyOrigin = allowedOrigins.includes('*');
const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  const cleanOrigin = origin.replace(/\/$/, '');
  const isAllowed = allowAnyOrigin ||
                    allowedOrigins.includes(cleanOrigin) ||
                    /\.novafxm\.com$/i.test(cleanOrigin) ||
                    /novafxm\.com$/i.test(cleanOrigin);
  callback(null, isAllowed);
};
const corsOptions = { origin: corsOrigin, credentials: true };

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
});
app.use(cors(corsOptions));
const HTTP_COMPRESSION_THRESHOLD = Math.max(512, Number(process.env.HTTP_COMPRESSION_THRESHOLD || 1024));
app.use((req, res, next) => {
  if (req.method === 'HEAD') return next();
  const accepted = String(req.headers['accept-encoding'] || '');
  const encoding = accepted.includes('br') ? 'br' : accepted.includes('gzip') ? 'gzip' : null;
  if (!encoding) return next();

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  const chunks = [];

  res.write = (chunk, chunkEncoding, callback) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, chunkEncoding));
    if (typeof callback === 'function') process.nextTick(callback);
    return true;
  };

  res.end = (chunk, chunkEncoding, callback) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, chunkEncoding));
    const body = Buffer.concat(chunks);
    const contentType = String(res.getHeader('Content-Type') || '').toLowerCase();
    const compressible = (
      body.length >= HTTP_COMPRESSION_THRESHOLD &&
      res.statusCode >= 200 &&
      res.statusCode !== 204 &&
      res.statusCode !== 304 &&
      !res.getHeader('Content-Encoding') &&
      /(json|text|javascript|css|svg)/i.test(contentType)
    );

    if (!compressible) {
      if (body.length) res.setHeader('Content-Length', body.length);
      return originalEnd(body, undefined, callback);
    }

    const vary = String(res.getHeader('Vary') || '');
    if (!vary.toLowerCase().split(',').map((item) => item.trim()).includes('accept-encoding')) {
      res.setHeader('Vary', vary ? `${vary}, Accept-Encoding` : 'Accept-Encoding');
    }
    res.removeHeader('Content-Length');
    const done = (error, compressed) => {
      if (error) return originalEnd(body, undefined, callback);
      res.setHeader('Content-Encoding', encoding);
      return originalEnd(compressed, undefined, callback);
    };
    if (encoding === 'br') return zlib.brotliCompress(body, done);
    return zlib.gzip(body, done);
  };

  return next();
});
app.use(express.json({ limit: '12mb' }));

let databaseStatus = 'starting';
let databaseError = null;

app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/', (req, res) => res.json({
  status: 'ok',
  service: 'VeltriumFX API',
  health: '/api/health',
  masterEnabled: isMasterEnabled(),
}));
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  service: 'VeltriumFX API',
  database: databaseStatus,
  masterEnabled: isMasterEnabled(),
}));
app.get('/api/ready', (req, res) => res.status(databaseStatus === 'ready' ? 200 : 503).json({
  status: databaseStatus === 'ready' ? 'ready' : 'not_ready',
  database: databaseStatus,
  ...(databaseError ? { message: databaseError } : {}),
}));

app.use('/api', (req, res, next) => {
  if (databaseStatus !== 'ready') {
    return res.status(503).json({ message: 'Database is not ready. Please try again shortly.' });
  }
  return next();
});
console.log('[startup] Registering API routes.');
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/trades', require('./routes/tradeRoutes'));
app.use('/api/market', require('./routes/marketRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
// Master routes are conditionally registered based on ENABLE_MASTER env variable.
// VeltriumFX sets ENABLE_MASTER=false; master management is done from NovaFXM platform.
if (isMasterEnabled()) {
  app.use('/api/master', require('./routes/masterRoutes'));
} else {
  app.use('/api/master', (req, res) => {
    res.status(403).json({
      message: 'Master access is disabled on this platform. Please use the NovaFXM platform to manage companies.',
    });
  });
}
app.use('/api/support', require('./routes/supportRoutes'));
console.log('[startup] API routes registered.');


app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
  console.error(`[request] ${req.method} ${req.originalUrl}:`, error?.stack || error);
  
  // Write to a local error log file for troubleshooting
  try {
    const fs = require('fs');
    const path = require('path');
    const logMsg = `\nDate: ${new Date().toISOString()}\nMethod: ${req.method}\nURL: ${req.originalUrl}\nBody: ${JSON.stringify(req.body, null, 2)}\nError: ${error?.stack || error}\n--------------------------------------------------\n`;
    fs.appendFileSync(path.join(__dirname, '../error_log.txt'), logMsg, 'utf8');
  } catch (logErr) {
    console.error('Failed to write to error_log.txt:', logErr);
  }

  if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
    const message = error.errors?.map(e => e.message).join(', ') || error.message;
    return res.status(400).json({ message });
  }
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Internal server error.' });
});

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';
const DB_RETRY_MS = Math.max(5000, Number(process.env.DB_RETRY_MS || 15000));

async function start() {
  console.log('[startup] Creating HTTP and Socket.IO servers.');
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
  }

  const server = http.createServer(app);
  server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 30000);
  server.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS || 35000);
  server.keepAliveTimeout = Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS || 65000);
  server.maxHeadersCount = 100;
  const io = new Server(server, {
    cors: corsOptions,
    perMessageDeflate: {
      threshold: Number(process.env.SOCKET_COMPRESSION_THRESHOLD || 512),
    },
  });
  const { setIo } = require('./config/socketIo');
  setIo(io);
  let databaseRetryTimer;
  let stopPriceStream = () => {};
  let stopCandleCatchupScheduler = () => {};
  let ticker;
  let runtimeStarted = false;
  const MARKET_DELTA_MS = Math.max(100, Number(process.env.MARKET_DELTA_MS || 250));
  const MARKET_FULL_SNAPSHOT_MS = Math.max(2000, Number(process.env.MARKET_FULL_SNAPSHOT_MS || 10000));
  let lastMarketBroadcast = new Map();
  let pendingMarketPrices = null;
  let marketEmitTimer = null;

  const compactPrice = (item) => ({
    symbol: item.symbol,
    price: item.price,
    bid: item.bid,
    ask: item.ask,
    decimals: item.decimals,
    spread: item.spread,
    spreadPoints: item.spreadPoints,
    change: item.change,
    source: item.source,
  });

  const hasPriceChanged = (previous, next) => (
    !previous ||
    previous.price !== next.price ||
    previous.bid !== next.bid ||
    previous.ask !== next.ask ||
    previous.change !== next.change ||
    previous.source !== next.source
  );

  const changedPrices = (prices) => {
    const changed = [];
    prices.forEach((item) => {
      const compact = compactPrice(item);
      if (hasPriceChanged(lastMarketBroadcast.get(compact.symbol), compact)) changed.push(compact);
      lastMarketBroadcast.set(compact.symbol, compact);
    });
    return changed;
  };

  const emitMarketPrices = (prices, full = false) => {
    if (!io.engine.clientsCount) return;
    if (full) {
      const compact = prices.map(compactPrice);
      lastMarketBroadcast = new Map(compact.map((item) => [item.symbol, item]));
      io.emit('market:prices', compact);
      return;
    }
    const changed = changedPrices(prices);
    if (changed.length) io.emit('market:prices:delta', changed);
  };

  const queueMarketPrices = (prices) => {
    pendingMarketPrices = prices;
    if (marketEmitTimer) return;
    marketEmitTimer = setTimeout(() => {
      marketEmitTimer = null;
      const next = pendingMarketPrices;
      pendingMarketPrices = null;
      if (next) emitMarketPrices(next);
    }, MARKET_DELTA_MS);
    marketEmitTimer.unref();
  };

  io.on('connection', (socket) => {
    tradingView.getPrices()
      .then((prices) => socket.emit('market:prices', prices.map(compactPrice)))
      .catch((error) => console.error('Unable to send initial prices:', error.message));
  });

  const startRuntimeServices = () => {
    if (runtimeStarted) return;
    runtimeStarted = true;
    console.log('[startup] Starting market stream and scheduler services.');
    stopPriceStream = tradingView.startPriceStream((prices) => {
      processTradeTriggers(prices).catch((error) => console.error('Trade trigger processing failed:', error.message));
      queueMarketPrices(prices);
    });
    stopCandleCatchupScheduler = startCandleCatchupScheduler();
    ticker = setInterval(() => {
      if (!io.engine.clientsCount) return;
      tradingView.getPrices()
        .then((prices) => {
          processTradeTriggers(prices).catch((error) => console.error('Trade trigger processing failed:', error.message));
          emitMarketPrices(prices, true);
        })
        .catch((error) => console.error('Market price refresh failed:', error.message));
    }, MARKET_FULL_SNAPSHOT_MS);
  };

  const connectDatabase = async () => {
    databaseStatus = 'starting';
    databaseError = null;
    try {
      console.log('[startup] Validating runtime environment.');
      validateEnvironment();
      console.log('[startup] Environment validation passed.');
      console.log('[startup] Connecting to MySQL.');
      await sequelize.authenticate();
      if (process.env.DB_CREATE_MISSING_TABLES_ON_START !== 'false' || process.env.DB_SYNC_ON_START === 'true') {
        console.log('[startup] Preparing missing database tables.');
        await sequelize.sync();
      }
      console.log('[startup] Ensuring database schema compatibility.');
      await ensureSchema();
      databaseStatus = 'ready';
      console.log('MySQL connection established.');
      startRuntimeServices();
    } catch (error) {
      databaseStatus = 'error';
      databaseError = error?.parent?.code || error?.original?.code || error?.message || 'Database initialization failed';
      console.error('Database initialization failed:', databaseError);
      console.error(error?.stack || error);
      console.error(`[startup] Retrying database initialization in ${DB_RETRY_MS}ms.`);
      databaseRetryTimer = setTimeout(connectDatabase, DB_RETRY_MS);
      databaseRetryTimer.unref();
    }
  };

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, () => {
      server.off('error', reject);
      console.log(`NOVA FXM API listening on ${HOST}:${PORT}; startup=${Date.now() - startupStartedAt}ms`);
      resolve();
    });
  });

  connectDatabase();

  const shutdown = (signal) => {
    console.log(`${signal} received; shutting down.`);
    clearTimeout(databaseRetryTimer);
    clearInterval(ticker);
    clearTimeout(marketEmitTimer);
    stopPriceStream();
    stopCandleCatchupScheduler();
    server.close(async () => {
      await sequelize.close().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  return server;
}

let bootPromise;
function boot() {
  if (!bootPromise) {
    bootPromise = start().catch((error) => {
    console.error('Unable to start HTTP server:', error?.stack || error);
    process.exit(1);
    });
  }
  return bootPromise;
}

// Hostinger may import an entry module through its own launcher, making
// require.main !== module. Production therefore boots on import as well.
if (require.main === module || process.env.NODE_ENV === 'production') boot();

module.exports = { app, start, boot };
