const WebSocket = require('ws');
const axios = require('axios');
const {
  aggregateCandles,
  bucketTime,
  candlesAlignWithTimeframe,
  readCandles,
  saveCandles,
} = require('./candleStore');
const { fetchRecentCandles, timeframeSeconds } = require('./recentCandleFetcher');

const instrument = (ticker, symbol, name, group, scanner, popular = false) => ({
  ticker, symbol, name, group, scanner, popular,
});

const allInstruments = [
  instrument('BINANCE:AAVEUSDT', 'AAVE/USD', 'Aave / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:ADAUSDT', 'ADA/USD', 'Cardano / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:APEUSDT', 'APE/USD', 'ApeCoin / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:APTUSDT', 'APT/USD', 'Aptos / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:ARBUSDT', 'ARB/USD', 'Arbitrum / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:ATOMUSDT', 'ATOM/USD', 'Cosmos / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:AVAXUSDT', 'AVAX/USD', 'Avalanche / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:AXSUSDT', 'AXS/USD', 'Axie Infinity / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:BATUSDT', 'BAT/USD', 'Basic Attention Token / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('COINBASE:BCHEUR', 'BCH/EUR', 'Bitcoin Cash / Euro', 'CRYPTO CFD', 'crypto'),
  instrument('COINBASE:BCHGBP', 'BCH/GBP', 'Bitcoin Cash / Pound', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:BCHUSDT', 'BCH/USD', 'Bitcoin Cash / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('COINBASE:BTCEUR', 'BTC/EUR', 'Bitcoin / Euro', 'CRYPTO CFD', 'crypto'),
  instrument('COINBASE:BTCGBP', 'BTC/GBP', 'Bitcoin / Pound', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:BTCUSDT', 'BTC/USD', 'Bitcoin / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:BNBUSDT', 'BNB/USD', 'BNB / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:CHZUSDT', 'CHZ/USD', 'Chiliz / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:CRVUSDT', 'CRV/USD', 'Curve / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:DOGEUSDT', 'DOGE/USD', 'Dogecoin / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:DOTUSDT', 'DOT/USD', 'Polkadot / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:EOSUSDT', 'EOS/USD', 'EOS / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:ETCUSDT', 'ETC/USD', 'Ethereum Classic / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('COINBASE:ETHEUR', 'ETH/EUR', 'Ethereum / Euro', 'CRYPTO CFD', 'crypto'),
  instrument('COINBASE:ETHGBP', 'ETH/GBP', 'Ethereum / Pound', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:ETHUSDT', 'ETH/USD', 'Ethereum / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:FILUSDT', 'FIL/USD', 'Filecoin / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:FETUSDT', 'FET/USD', 'Artificial Superintelligence Alliance / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:GALUSDT', 'GAL/USD', 'Galxe / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:GMTUSDT', 'GMT/USD', 'STEPN / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:GRTUSDT', 'GRT/USD', 'The Graph / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:IMXUSDT', 'IMX/USD', 'Immutable / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:INJUSDT', 'INJ/USD', 'Injective / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:KNCUSDT', 'KNC/USD', 'Kyber Network / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:KSMUSDT', 'KSM/USD', 'Kusama / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:LINKUSDT', 'LINK/USD', 'Chainlink / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:LPTUSDT', 'LPT/USD', 'Livepeer / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:LRCUSDT', 'LRC/USD', 'Loopring / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('COINBASE:LTCEUR', 'LTC/EUR', 'Litecoin / Euro', 'CRYPTO CFD', 'crypto'),
  instrument('COINBASE:LTCGBP', 'LTC/GBP', 'Litecoin / Pound', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:LTCUSDT', 'LTC/USD', 'Litecoin / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:MKRUSDT', 'MKR/USD', 'Maker / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:NEARUSDT', 'NEAR/USD', 'NEAR Protocol / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:OPUSDT', 'OP/USD', 'Optimism / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:PEPEUSDT', 'PEPE/USD', 'Pepe / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:POLUSDT', 'POL/USD', 'Polygon Ecosystem Token / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:RENDERUSDT', 'RENDER/USD', 'Render / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:SEIUSDT', 'SEI/USD', 'Sei / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:SHIBUSDT', 'SHIB/USD', 'Shiba Inu / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:SKLUSDT', 'SKL/USD', 'SKALE / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:SNXUSDT', 'SNX/USD', 'Synthetix / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:SOLUSDT', 'SOL/USD', 'Solana / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:SUIUSDT', 'SUI/USD', 'Sui / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:TONUSDT', 'TON/USD', 'Toncoin / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:TRXUSDT', 'TRX/USD', 'TRON / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:UNIUSDT', 'UNI/USD', 'Uniswap / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:WLDUSDT', 'WLD/USD', 'Worldcoin / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:XRPUSDT', 'XRP/USD', 'XRP / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:XTZUSDT', 'XTZ/USD', 'Tezos / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:YFIUSDT', 'YFI/USD', 'yearn.finance / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:ZECUSDT', 'ZEC/USD', 'Zcash / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:ZENUSDT', 'ZEN/USD', 'Horizen / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('BINANCE:ZRXUSDT', 'ZRX/USD', '0x / US Dollar', 'CRYPTO CFD', 'crypto'),
  instrument('OANDA:BCOUSD', 'BRN/USD', 'Brent Crude Oil', 'ENERGIES', 'cfd'),
  instrument('OANDA:NATGASUSD', 'NGC/USD', 'Natural Gas', 'ENERGIES', 'cfd'),
  instrument('OANDA:WTICOUSD', 'WTI/USD', 'West Texas Oil', 'ENERGIES', 'cfd', true),
  instrument('FX:AUDCAD', 'AUD/CAD', 'Australian Dollar / Canadian Dollar', 'FOREX', 'forex'),
  instrument('FX:AUDCHF', 'AUD/CHF', 'Australian Dollar / Swiss Franc', 'FOREX', 'forex'),
  instrument('FX:AUDJPY', 'AUD/JPY', 'Australian Dollar / Yen', 'FOREX', 'forex'),
  instrument('FX:AUDNZD', 'AUD/NZD', 'Australian Dollar / New Zealand Dollar', 'FOREX', 'forex'),
  instrument('FX:AUDSGD', 'AUD/SGD', 'Australian Dollar / Singapore Dollar', 'FOREX', 'forex'),
  instrument('FX:AUDUSD', 'AUD/USD', 'Australian Dollar / US Dollar', 'FOREX', 'forex'),
  instrument('FX:CADCHF', 'CAD/CHF', 'Canadian Dollar / Swiss Franc', 'FOREX', 'forex'),
  instrument('FX:CADJPY', 'CAD/JPY', 'Canadian Dollar / Yen', 'FOREX', 'forex'),
  instrument('FX:CHFJPY', 'CHF/JPY', 'Swiss Franc / Yen', 'FOREX', 'forex'),
  instrument('FX:EURAUD', 'EUR/AUD', 'Euro / Australian Dollar', 'FOREX', 'forex'),
  instrument('FX:EURCAD', 'EUR/CAD', 'Euro / Canadian Dollar', 'FOREX', 'forex'),
  instrument('FX:EURCHF', 'EUR/CHF', 'Euro / Swiss Franc', 'FOREX', 'forex', true),
  instrument('FX:EURGBP', 'EUR/GBP', 'Euro / Pound', 'FOREX', 'forex'),
  instrument('FX:EURJPY', 'EUR/JPY', 'Euro / Yen', 'FOREX', 'forex', true),
  instrument('FX:EURUSD', 'EUR/USD', 'Euro / US Dollar', 'FOREX', 'forex', true),
  instrument('FX:GBPAUD', 'GBP/AUD', 'British Pound / Australian Dollar', 'FOREX', 'forex'),
  instrument('FX:GBPCAD', 'GBP/CAD', 'British Pound / Canadian Dollar', 'FOREX', 'forex'),
  instrument('FX:GBPCHF', 'GBP/CHF', 'British Pound / Swiss Franc', 'FOREX', 'forex'),
  instrument('FX:GBPJPY', 'GBP/JPY', 'British Pound / Yen', 'FOREX', 'forex'),
  instrument('FX:GBPNZD', 'GBP/NZD', 'British Pound / New Zealand Dollar', 'FOREX', 'forex'),
  instrument('FX:GBPUSD', 'GBP/USD', 'British Pound / US Dollar', 'FOREX', 'forex', true),
  instrument('FX:NZDCAD', 'NZD/CAD', 'New Zealand Dollar / Canadian Dollar', 'FOREX', 'forex'),
  instrument('FX:NZDCHF', 'NZD/CHF', 'New Zealand Dollar / Swiss Franc', 'FOREX', 'forex'),
  instrument('FX:NZDJPY', 'NZD/JPY', 'New Zealand Dollar / Yen', 'FOREX', 'forex'),
  instrument('FX:NZDUSD', 'NZD/USD', 'New Zealand Dollar / US Dollar', 'FOREX', 'forex'),
  instrument('FX:USDCAD', 'USD/CAD', 'US Dollar / Canadian Dollar', 'FOREX', 'forex'),
  instrument('FX:USDCHF', 'USD/CHF', 'US Dollar / Swiss Franc', 'FOREX', 'forex'),
  instrument('FX:USDCNH', 'USD/CNH', 'US Dollar / Chinese Yuan', 'FOREX', 'forex'),
  instrument('FX:USDHKD', 'USD/HKD', 'US Dollar / Hong Kong Dollar', 'FOREX', 'forex'),
  instrument('FX:USDJPY', 'USD/JPY', 'US Dollar / Yen', 'FOREX', 'forex', true),
  instrument('FX:USDMXN', 'USD/MXN', 'US Dollar / Mexican Peso', 'FOREX', 'forex'),
  instrument('FX:USDSGD', 'USD/SGD', 'US Dollar / Singapore Dollar', 'FOREX', 'forex'),
  instrument('FX:USDTRY', 'USD/TRY', 'US Dollar / Turkish Lira', 'FOREX', 'forex'),
  instrument('OANDA:AU200AUD', 'ASX/AUD', 'Australia 200', 'INDICES', 'cfd'),
  instrument('OANDA:DE30EUR', 'DAX/EUR', 'Germany 40', 'INDICES', 'cfd'),
  instrument('OANDA:US30USD', 'DJI/USD', 'Dow Jones', 'INDICES', 'cfd'),
  instrument('OANDA:EU50EUR', 'ESX/EUR', 'Euro Stoxx 50', 'INDICES', 'cfd'),
  instrument('OANDA:FR40EUR', 'F40/EUR', 'France 40', 'INDICES', 'cfd'),
  instrument('OANDA:UK100GBP', 'FTS/GBP', 'UK 100', 'INDICES', 'cfd'),
  instrument('OANDA:HK33HKD', 'HSI/HKD', 'Hong Kong 33', 'INDICES', 'cfd'),
  instrument('OANDA:ESPIXEUR', 'IBX/EUR', 'Spain 35', 'INDICES', 'cfd'),
  instrument('OANDA:NAS100USD', 'NDX/USD', 'Nasdaq 100', 'INDICES', 'cfd'),
  instrument('OANDA:JP225USD', 'NIK/JPY', 'Japan 225', 'INDICES', 'cfd'),
  instrument('OANDA:SPX500USD', 'SPX/USD', 'S&P 500', 'INDICES', 'cfd'),
  instrument('OANDA:XAGAUD', 'XAG/AUD', 'Silver / Australian Dollar', 'METALS', 'forex'),
  instrument('OANDA:XAGCHF', 'XAG/CHF', 'Silver / Swiss Franc', 'METALS', 'forex'),
  instrument('OANDA:XAGEUR', 'XAG/EUR', 'Silver / Euro', 'METALS', 'forex'),
  instrument('OANDA:XAGGBP', 'XAG/GBP', 'Silver / Pound', 'METALS', 'forex'),
  instrument('OANDA:XAGUSD', 'XAG/USD', 'Silver / US Dollar', 'METALS', 'forex', true),
  instrument('OANDA:XAUAUD', 'XAU/AUD', 'Gold / Australian Dollar', 'METALS', 'forex'),
  instrument('OANDA:XAUCHF', 'XAU/CHF', 'Gold / Swiss Franc', 'METALS', 'forex'),
  instrument('OANDA:XAUEUR', 'XAU/EUR', 'Gold / Euro', 'METALS', 'forex'),
  instrument('OANDA:XAUGBP', 'XAU/GBP', 'Gold / Pound', 'METALS', 'forex'),
  instrument('OANDA:XAUUSD', 'XAU/USD', 'Gold / US Dollar', 'METALS', 'forex', true),
  instrument('OANDA:XPDUSD', 'XPD/USD', 'Palladium / US Dollar', 'METALS', 'forex'),
  instrument('OANDA:XPTUSD', 'XPT/USD', 'Platinum / US Dollar', 'METALS', 'forex'),
];

const POPULAR_ORDER = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'EUR/CHF', 'EUR/JPY', 'XAU/USD', 'XAG/USD', 'WTI/USD'];

const instruments = allInstruments;
const streamInstruments = [...instruments].sort((left, right) => {
  if (left.popular && right.popular) {
    const idxA = POPULAR_ORDER.indexOf(left.symbol);
    const idxB = POPULAR_ORDER.indexOf(right.symbol);
    return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
  }
  if (left.popular !== right.popular) return right.popular ? 1 : -1;
  return left.symbol.localeCompare(right.symbol);
});

let priceCache = { at: 0, data: null };
const latestQuotes = new Map();
const quoteValues = new Map();
const streamListeners = new Set();
const instrumentsByTicker = new Map(instruments.map((item) => [item.ticker, item]));
const STREAM_STALE_MS = 15000;
const STREAM_RECONNECT_MS = 5000;
const CANDLE_CACHE_MS = 15000;
const CENTRAL_CANDLE_API_URL = String(process.env.CENTRAL_CANDLE_API_URL || '').replace(/\/$/, '');
const CENTRAL_CANDLE_API_KEY = String(process.env.CENTRAL_CANDLE_API_KEY || '');
const USE_CENTRAL_CANDLES = process.env.CENTRAL_CANDLE_SOURCE === 'true';
const DERIVED_CANDLE_SOURCES = {
  '3m': '1m',
  '5m': '1m',
  '15m': '1m',
  '30m': '1m',
  '1H': '1m',
  '2H': '1m',
  '3H': '1m',
  '4H': '1m',
  '6H': '1m',
  '8H': '1m',
  '12H': '1m',
  '3D': '1D',
  '1W': '1D',
  '1M': '1D',
  '3M': '1M',
  '6M': '1M',
  '12M': '1M',
};
const CANDLE_SECONDS = {
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
  '1M': 2592000,
  '3M': 7776000,
  '6M': 15552000,
  '12M': 31536000,
};
const LIVE_CANDLE_FLUSH_MS = 15000;
let quoteSocket = null;
let reconnectTimer = null;
const candleCache = new Map();
const liveCandleBuffer = new Map();
let liveCandleFlushTimer = null;
let isFlushingLiveCandles = false;
const autoCatchupLocks = new Map();
const autoCatchupLastRun = new Map();
const AUTO_CATCHUP_ENABLED = process.env.AUTO_CATCHUP_ENABLED !== 'false';
const AUTO_CATCHUP_DAYS = Math.max(1, Math.min(Number(process.env.AUTO_CATCHUP_DAYS) || 2, 14));
const AUTO_CATCHUP_THROTTLE_MS = Math.max(60000, Number(process.env.AUTO_CATCHUP_THROTTLE_MS) || 5 * 60000);
const AUTO_CATCHUP_ALWAYS_RECENT = process.env.AUTO_CATCHUP_ALWAYS_RECENT !== 'false';
const AUTO_CATCHUP_LOGS_ENABLED = process.env.AUTO_CATCHUP_LOGS_ENABLED === 'true';
const LIVE_CANDLE_SAVE_ENABLED = process.env.LIVE_CANDLE_SAVE_ENABLED === 'true';
const RECENT_CANDLE_SAVE_ENABLED = process.env.RECENT_CANDLE_SAVE_ENABLED !== 'false';
const csv = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const LIVE_CANDLE_TIMEFRAMES = csv(process.env.LIVE_CANDLE_SAVE_TIMEFRAMES || '1m');
const LIVE_CANDLE_SAVE_SYMBOLS = new Set(csv(process.env.LIVE_CANDLE_SAVE_SYMBOLS || ''));
const RECENT_CANDLE_LOOKBACK_SECONDS = Math.max(
  3600,
  (Number(process.env.RECENT_CANDLE_LOOKBACK_MINUTES) || 60) * 60,
);

const decimalsFor = (price, group) => {
  if (group === 'FOREX') return price >= 10 ? 3 : 5;
  if (group === 'CRYPTO CFD') return price >= 100 ? 2 : price >= 1 ? 3 : 6;
  if (group === 'INDICES') return price >= 100 ? 2 : 1;
  if (group === 'ENERGIES') return price >= 10 ? 3 : 4;
  if (group === 'METALS') return price >= 100 ? 2 : 3;
  return 2;
};

const normalizeSpreadSymbol = (symbol) => String(symbol || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

const FIXED_SPREADS = {
  AAVEUSD: { value: 4.0, unit: 'pip' },
  ADAUSD: { value: 10.1, unit: 'pip' },
  APEUSD: { value: 0.3, unit: 'pip' },
  APTUSD: { value: 5.0, unit: 'pip' },
  ARBUSD: { value: 2.0, unit: 'pip' },
  ATOMUSD: { value: 4.0, unit: 'pip' },
  AVAXUSD: { value: 4.0, unit: 'pip' },
  AXSUSD: { value: 0.2, unit: 'pip' },
  BATUSD: { value: 10.0, unit: 'pip' },
  BCHUSD: { value: 6.0, unit: 'pip' },
  BNBUSD: { value: 6.0, unit: 'pip' },
  BTCUSD: { value: 0.3, unit: 'pip' },
  CHZUSD: { value: 0.3, unit: 'pip' },
  CRVUSD: { value: 0.4, unit: 'pip' },
  DOGEUSD: { value: 0.3, unit: 'pip' },
  DOTUSD: { value: 3.0, unit: 'pip' },
  EOSUSD: { value: 0.5, unit: 'pip' },
  ETCUSD: { value: 4.0, unit: 'pip' },
  ETHUSD: { value: 0.3, unit: 'pip' },
  FETUSD: { value: 0.5, unit: 'pip' },
  FILUSD: { value: 3.0, unit: 'pip' },
  GALUSD: { value: 1.0, unit: 'pip' },
  GMTUSD: { value: 0.3, unit: 'pip' },
  GRTUSD: { value: 0.3, unit: 'pip' },
  IMXUSD: { value: 0.5, unit: 'pip' },
  INJUSD: { value: 4.0, unit: 'pip' },
  KNCUSD: { value: 0.5, unit: 'pip' },
  KSMUSD: { value: 4.0, unit: 'pip' },
  LINKUSD: { value: 4.0, unit: 'pip' },
  LPTUSD: { value: 4.0, unit: 'pip' },
  LRCUSD: { value: 0.3, unit: 'pip' },
  LTCUSD: { value: 5.0, unit: 'pip' },
  MKRUSD: { value: 8.0, unit: 'pip' },
  NEARUSD: { value: 3.0, unit: 'pip' },
  OPUSD: { value: 0.5, unit: 'pip' },
  PEPEUSD: { value: 0.3, unit: 'pip' },
  POLUSD: { value: 0.3, unit: 'pip' },
  RENDERUSD: { value: 3.0, unit: 'pip' },
  SEIUSD: { value: 0.3, unit: 'pip' },
  SHIBUSD: { value: 0.3, unit: 'pip' },
  SKLUSD: { value: 0.3, unit: 'pip' },
  SNXUSD: { value: 1.0, unit: 'pip' },
  SOLUSD: { value: 5.0, unit: 'pip' },
  SUIUSD: { value: 2.0, unit: 'pip' },
  TONUSD: { value: 2.0, unit: 'pip' },
  TRXUSD: { value: 0.3, unit: 'pip' },
  UNIUSD: { value: 3.0, unit: 'pip' },
  WLDUSD: { value: 1.0, unit: 'pip' },
  XRPUSD: { value: 0.3, unit: 'pip' },
  XTZUSD: { value: 0.5, unit: 'pip' },
  YFIUSD: { value: 8.0, unit: 'pip' },
  ZECUSD: { value: 4.0, unit: 'pip' },
  ZENUSD: { value: 4.0, unit: 'pip' },
  ZRXUSD: { value: 0.3, unit: 'pip' },
  BRNUSD: { value: 3.0, unit: 'pip' },
  NGCUSD: { value: 3.2, unit: 'pip' },
  WTIUSD: { value: 4.2, unit: 'pip' },
  XAGAUD: { value: 1.2, unit: 'pip' },
  XAGCHF: { value: 1.2, unit: 'pip' },
  XAGEUR: { value: 1.2, unit: 'pip' },
  XAGGBP: { value: 1.2, unit: 'pip' },
  XAGUSD: { value: 1.2, unit: 'pip' },
  XAUAUD: { value: 0.3, unit: 'pip' },
  XAUCHF: { value: 0.3, unit: 'pip' },
  XAUEUR: { value: 0.3, unit: 'pip' },
  XAUGBP: { value: 0.3, unit: 'pip' },
  XAUUSD: { value: 0.3, unit: 'pip' },
  ASXAUD: { value: 0.0, unit: 'pip' },
  DAXEUR: { value: 0.0, unit: 'pip' },
  DJIUSD: { value: 0.0, unit: 'pip' },
  ESXEUR: { value: 0.0, unit: 'pip' },
  F40EUR: { value: 0.0, unit: 'pip' },
  FTSGBP: { value: 0.0, unit: 'pip' },
  HSIHKD: { value: 0.0, unit: 'pip' },
  IBXEUR: { value: 0.0, unit: 'pip' },
  NDXUSD: { value: 0.0, unit: 'pip' },
  NIKJPY: { value: 0.0, unit: 'pip' },
  SPXUSD: { value: 0.0, unit: 'pip' },
  CRYPTO_DEFAULT: { value: 0.3, unit: 'pip' },
  FOREX_DEFAULT: { value: 0.3, unit: 'pip' },
  FOREX_JPY_DEFAULT: { value: 1.2, unit: 'pip' },
  ENERGIES_DEFAULT: { value: 3.0, unit: 'pip' },
  METALS_DEFAULT: { value: 0.3, unit: 'pip' },
  INDICES_DEFAULT: { value: 0.0, unit: 'pip' },
  DEFAULT: { value: 0.3, unit: 'pip' },
};

function getFixedSpread(symbol, group) {
  const symbolSpread = FIXED_SPREADS[normalizeSpreadSymbol(symbol)];
  if (symbolSpread) return symbolSpread;
  if (group === 'CRYPTO CFD') return FIXED_SPREADS.CRYPTO_DEFAULT;
  if (group === 'FOREX') {
    return normalizeSpreadSymbol(symbol).includes('JPY')
      ? FIXED_SPREADS.FOREX_JPY_DEFAULT
      : FIXED_SPREADS.FOREX_DEFAULT;
  }
  if (group === 'ENERGIES') return FIXED_SPREADS.ENERGIES_DEFAULT;
  if (group === 'METALS') return FIXED_SPREADS.METALS_DEFAULT;
  if (group === 'INDICES') return FIXED_SPREADS.INDICES_DEFAULT;
  return FIXED_SPREADS.DEFAULT;
}

function convertSpreadToPrice(symbol, spreadConfig, decimals = 2) {
  const value = Number(spreadConfig?.value || 0);
  const precision = Number.isFinite(Number(decimals)) ? Number(decimals) : 2;
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (spreadConfig?.unit === 'point') return value * (10 ** -precision);
  return value * (10 ** (1 - precision));
}

function applyFixedSpread(symbol, basePrice, decimals, group) {
  const price = Number(basePrice);
  const spreadConfig = getFixedSpread(symbol, group);
  const precision = Number.isFinite(Number(decimals)) ? Number(decimals) : 2;
  const fixedSpread = convertSpreadToPrice(symbol, spreadConfig, precision);
  const halfSpread = fixedSpread / 2;
  const bid = Number((price - halfSpread).toFixed(precision));
  const ask = Number((price + halfSpread).toFixed(precision));
  return {
    bid,
    ask,
    spread: Number(Number(spreadConfig.value || 0).toFixed(1)),
    spreadPoints: Number(Number(spreadConfig.value || 0).toFixed(1)),
  };
}

function quoteWithFixedSpread(instrument, quote) {
  const price = Number(quote?.price);
  if (!Number.isFinite(price) || price <= 0) return quote;
  const decimals = Number.isFinite(Number(quote.decimals))
    ? Number(quote.decimals)
    : decimalsFor(price, instrument.group);
  const fixedSpread = applyFixedSpread(instrument.symbol, price, decimals, instrument.group);
  return {
    ...quote,
    bid: fixedSpread.bid,
    ask: fixedSpread.ask,
    decimals,
    spread: fixedSpread.spread,
    spreadPoints: fixedSpread.spreadPoints,
  };
}

function visibleInstrument(item, quoteValues) {
  const { ticker, scanner, ...visible } = item;
  return { ...visible, tradingViewSymbol: ticker, ...quoteValues };
}

const packMessage = (method, params) => {
  const payload = JSON.stringify({ m: method, p: params });
  return `~m~${payload.length}~m~${payload}`;
};

const unpackMessages = (raw) => {
  const messages = [];
  const text = String(raw);
  let offset = 0;
  while (offset < text.length) {
    const header = text.indexOf('~m~', offset);
    if (header === -1) break;
    const lengthStart = header + 3;
    const lengthEnd = text.indexOf('~m~', lengthStart);
    if (lengthEnd === -1) break;
    const length = Number(text.slice(lengthStart, lengthEnd));
    const payloadStart = lengthEnd + 3;
    const payload = text.slice(payloadStart, payloadStart + length);
    offset = payloadStart + length;
    try {
      messages.push(JSON.parse(payload));
    } catch {}
  }
  return messages;
};

const quoteFromTradingView = (instrument, values) => {
  const rawBid = Number(values.bid);
  const rawAsk = Number(values.ask);
  const hasBidAsk = Number.isFinite(rawBid) && rawBid > 0 && Number.isFinite(rawAsk) && rawAsk > 0;
  const price = hasBidAsk ? (rawBid + rawAsk) / 2 : Number(values.lp || values.bid || values.ask || 0);
  if (!price) return fallbackPrice(instrument);
  const decimals = decimalsFor(price, instrument.group);
  const fixedSpread = applyFixedSpread(instrument.symbol, price, decimals, instrument.group);
  return visibleInstrument(instrument, {
    price: Number(price.toFixed(decimals)),
    bid: fixedSpread.bid,
    ask: fixedSpread.ask,
    decimals,
    spread: fixedSpread.spread,
    spreadPoints: fixedSpread.spreadPoints,
    change: Number(values.chp || 0),
    source: 'tradingview',
    updatedAt: new Date().toISOString(),
  });
};

function bufferLiveCandle(quote) {
  if (!LIVE_CANDLE_SAVE_ENABLED) return;

  const price = Number(quote?.price);
  if (!quote?.symbol || !Number.isFinite(price) || price <= 0) return;
  if (!['tradingview', 'stale'].includes(quote.source)) return;
  if (LIVE_CANDLE_SAVE_SYMBOLS.size && !LIVE_CANDLE_SAVE_SYMBOLS.has(quote.symbol)) return;

  LIVE_CANDLE_TIMEFRAMES.forEach((timeframe) => {
    const time = bucketTime(Math.floor(Date.now() / 1000), timeframe);
    const key = `${quote.symbol}:${timeframe}:${time}`;
    const existing = liveCandleBuffer.get(key);

    if (!existing) {
      liveCandleBuffer.set(key, {
        symbol: quote.symbol,
        timeframe,
        candle: { time, open: price, high: price, low: price, close: price, volume: 0 },
      });
      return;
    }

    existing.candle.high = Math.max(existing.candle.high, price);
    existing.candle.low = Math.min(existing.candle.low, price);
    existing.candle.close = price;
  });

  scheduleLiveCandleFlush();
}

function scheduleLiveCandleFlush() {
  if (liveCandleFlushTimer) return;
  liveCandleFlushTimer = setTimeout(async () => {
    liveCandleFlushTimer = null;
    await flushLiveCandles();
  }, LIVE_CANDLE_FLUSH_MS);
}

async function flushLiveCandles() {
  if (isFlushingLiveCandles) {
    scheduleLiveCandleFlush();
    return;
  }
  if (!liveCandleBuffer.size) return;

  isFlushingLiveCandles = true;
  const pending = [...liveCandleBuffer.values()];
  liveCandleBuffer.clear();
  const groups = pending.reduce((map, item) => {
    const key = `${item.symbol}:${item.timeframe}`;
    const group = map.get(key) || { symbol: item.symbol, timeframe: item.timeframe, candles: [] };
    group.candles.push(item.candle);
    map.set(key, group);
    return map;
  }, new Map());

  try {
    for (const group of groups.values()) {
      await saveLiveCandleGroup(group);
    }
  } finally {
    isFlushingLiveCandles = false;
    if (liveCandleBuffer.size) scheduleLiveCandleFlush();
  }
}

const isDeadlockError = (error) => (
  error?.parent?.code === 'ER_LOCK_DEADLOCK' ||
  error?.original?.code === 'ER_LOCK_DEADLOCK' ||
  String(error?.message || '').includes('Deadlock found')
);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveLiveCandleGroup(group) {
  const candles = await normalizeLiveCandlesForSave(group);
  if (!candles.length) return;

  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await saveCandles(group.symbol, group.timeframe, candles);
      return;
    } catch (error) {
      if (!isDeadlockError(error) || attempt === maxAttempts) {
        console.warn(`Live candle save failed for ${group.symbol} ${group.timeframe}:`, error.message);
        return;
      }

      await delay(75 * attempt);
    }
  }
}

async function normalizeLiveCandlesForSave(group) {
  const candles = [...(group.candles || [])]
    .filter((candle) => Number.isFinite(Number(candle.time)))
    .sort((a, b) => Number(a.time) - Number(b.time));

  if (!candles.length) return [];

  const lastTime = Number(candles[candles.length - 1].time);
  const stored = await readCandles(group.symbol, group.timeframe, candles.length + 2, { to: lastTime + 1 }).catch(() => []);
  const storedByTime = new Map(stored.map((candle) => [Number(candle.time), candle]));
  let previous = stored.filter((candle) => Number(candle.time) < Number(candles[0].time)).at(-1) || null;

  return candles.map((candle) => {
    const time = Number(candle.time);
    const existing = storedByTime.get(time);
    const close = Number(candle.close);
    const storedOpen = Number(existing?.open);
    const previousClose = Number(previous?.close);
    const open = Number.isFinite(storedOpen)
      ? storedOpen
      : Number.isFinite(previousClose)
        ? previousClose
        : Number(candle.open);

    const adjusted = {
      time,
      open,
      high: Math.max(open, Number(existing?.high ?? candle.high), Number(candle.high), close),
      low: Math.min(open, Number(existing?.low ?? candle.low), Number(candle.low), close),
      close,
      volume: Number(existing?.volume || candle.volume || 0),
    };
    previous = adjusted;
    return adjusted;
  }).filter((candle) => (
    [candle.time, candle.open, candle.high, candle.low, candle.close].every(Number.isFinite)
  ));
}

function fallbackPrice(instrument) {
  return visibleInstrument(instrument, { price: 0, bid: 0, ask: 0, decimals: 2, spread: 0, spreadPoints: 0, change: 0, source: 'fallback' });
}

function keepPreviousPrices(nextPrices) {
  if (!priceCache.data) return nextPrices;
  const previousBySymbol = new Map(priceCache.data.map((item) => [item.symbol, item]));
  return nextPrices.map((item) => {
    const previous = previousBySymbol.get(item.symbol);
    if (previous && item.source === 'fallback' && !Number(item.price)) return previous;
    return item;
  });
}

function snapshotPrices() {
  const previousBySymbol = new Map((priceCache.data || []).map((item) => [item.symbol, item]));
  const now = Date.now();
  const prices = instruments.map((item) => {
    const quote = latestQuotes.get(item.ticker);
    if (quote) {
      const updatedAt = Date.parse(quote.updatedAt);
      if (Number.isFinite(updatedAt) && now - updatedAt > STREAM_STALE_MS) {
        return quoteWithFixedSpread(item, { ...quote, source: 'stale' });
      }
      return quoteWithFixedSpread(item, quote);
    }
    const previous = previousBySymbol.get(item.symbol);
    return previous ? quoteWithFixedSpread(item, previous) : fallbackPrice(item);
  });
  priceCache = { at: now, data: prices };
  return prices;
}

function publishPrices() {
  const prices = snapshotPrices();
  streamListeners.forEach((listener) => listener(prices));
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectQuoteStream();
  }, STREAM_RECONNECT_MS);
}

function connectQuoteStream() {
  if (quoteSocket && (
    quoteSocket.readyState === WebSocket.OPEN ||
    quoteSocket.readyState === WebSocket.CONNECTING
  )) return;

  const session = `qs_${Math.random().toString(36).slice(2, 14)}`;
  quoteSocket = new WebSocket('wss://data.tradingview.com/socket.io/websocket', {
    headers: {
      Origin: 'https://www.tradingview.com',
      Referer: 'https://www.tradingview.com/',
      'User-Agent': 'Mozilla/5.0',
    },
  });

  quoteSocket.on('open', () => {
    quoteSocket.send(packMessage('quote_create_session', [session]));
    quoteSocket.send(packMessage('quote_set_fields', [session, 'lp', 'chp', 'bid', 'ask', 'pricescale', 'minmov', 'pro_name']));
    streamInstruments.forEach((item) => quoteSocket.send(packMessage('quote_add_symbols', [session, item.ticker])));
    console.log('TradingView quote stream connected');
  });

  quoteSocket.on('message', (data) => {
    const raw = String(data);
    const heartbeatFrames = raw.match(/~m~\d+~m~~h~\d+/g) || [];
    heartbeatFrames.forEach((heartbeat) => {
      if (quoteSocket.readyState === WebSocket.OPEN) quoteSocket.send(heartbeat);
    });

    let changed = false;
    unpackMessages(raw).forEach((message) => {
      if (message.m !== 'qsd') return;
      const payload = message.p?.[1];
      const item = instrumentsByTicker.get(payload?.n);
      if (payload?.s !== 'ok' || !item) return;

      const values = { ...(quoteValues.get(item.ticker) || {}), ...(payload.v || {}) };
      quoteValues.set(item.ticker, values);
      if (!Number(values.lp || values.bid || values.ask)) return;
      const quote = quoteFromTradingView(item, values);
      latestQuotes.set(item.ticker, quote);
      bufferLiveCandle(quote);
      changed = true;
    });

    if (changed) publishPrices();
  });

  quoteSocket.on('close', () => {
    quoteSocket = null;
    console.warn('TradingView quote stream disconnected; reconnecting');
    scheduleReconnect();
  });

  quoteSocket.on('error', (error) => {
    console.warn('TradingView quote stream error:', error.message);
  });
}

async function getPrices() {
  connectQuoteStream();
  return snapshotPrices();
}

function startPriceStream(listener) {
  if (typeof listener === 'function') streamListeners.add(listener);
  connectQuoteStream();
  return () => streamListeners.delete(listener);
}

async function getPrice(symbol) {
  const prices = await getPrices();
  return prices.find((item) => item.symbol === symbol) || fallbackPrice(instruments[0]);
}

const chartInterval = (timeframe) => ({
  '1s': '1S',
  '1m': '1',
  '3m': '3',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1H': '60',
  '2H': '120',
  '3H': '180',
  '4H': '240',
  '6H': '360',
  '8H': '480',
  '12H': '720',
  '1D': '1D',
  '3D': '3D',
  '1W': '1W',
  '1M': '1M',
  '3M': '3M',
  '6M': '6M',
  '12M': '12M',
}[timeframe] || '15');

function requestCandles(item, timeframe = '15m', limit = 240) {
  return new Promise((resolve, reject) => {
    const session = `cs_${Math.random().toString(36).slice(2, 14)}`;
    const socket = new WebSocket('wss://data.tradingview.com/socket.io/websocket', {
      headers: {
        Origin: 'https://www.tradingview.com',
        Referer: 'https://www.tradingview.com/',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    const closeWith = (handler, value) => {
      clearTimeout(timer);
      try {
        socket.close();
      } catch {}
      handler(value);
    };
    const timer = setTimeout(() => closeWith(reject, new Error('TradingView candle request timed out')), 8000);

    socket.on('open', () => {
      const symbol = `=${JSON.stringify({ symbol: item.ticker, adjustment: 'splits', session: 'regular' })}`;
      socket.send(packMessage('chart_create_session', [session, '']));
      socket.send(packMessage('switch_timezone', [session, 'Etc/UTC']));
      socket.send(packMessage('resolve_symbol', [session, 'symbol_1', symbol]));
      socket.send(packMessage('create_series', [session, 's1', 's1', 'symbol_1', chartInterval(timeframe), limit, '']));
    });

    socket.on('message', (data) => {
      const raw = String(data);
      const heartbeatFrames = raw.match(/~m~\d+~m~~h~\d+/g) || [];
      heartbeatFrames.forEach((heartbeat) => {
        if (socket.readyState === WebSocket.OPEN) socket.send(heartbeat);
      });
      unpackMessages(raw).forEach((message) => {
        if (message.m === 'series_error' || message.m === 'symbol_error') {
          closeWith(reject, new Error('TradingView has no chart data for this symbol'));
          return;
        }
        const points = message.m === 'timescale_update' ? message.p?.[1]?.s1?.s : null;
        if (!Array.isArray(points) || !points.length) return;
        const candles = points.map(({ v }) => ({
          time: Number(v[0]),
          open: Number(v[1]),
          high: Number(v[2]),
          low: Number(v[3]),
          close: Number(v[4]),
        })).filter((bar) => Object.values(bar).every(Number.isFinite));
        closeWith(resolve, candles);
      });
    });
    socket.on('error', (error) => closeWith(reject, error));
  });
}

const latestCandleTime = (candles) => {
  if (!Array.isArray(candles) || candles.length === 0) return null;
  const latest = Number(candles[candles.length - 1]?.time);
  return Number.isFinite(latest) ? latest : null;
};

const recentGapStart = (candles, seconds, now) => {
  if (!Array.isArray(candles) || candles.length < 2) return null;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  const cutoff = now - AUTO_CATCHUP_DAYS * 86400;
  const expectedGap = Math.max(seconds * 1.5, seconds + 30);

  for (let index = candles.length - 1; index > 0; index--) {
    const current = Number(candles[index]?.time);
    const previous = Number(candles[index - 1]?.time);
    if (!Number.isFinite(current) || !Number.isFinite(previous)) continue;
    if (current < cutoff) break;
    if (current - previous > expectedGap) return previous;
  }

  return null;
};

const mergeCandles = (stored, recent, limit) => {
  const byTime = new Map();
  [...(stored || []), ...(recent || [])].forEach((bar) => {
    const candle = {
      time: Number(bar.time),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
    };
    if (Object.values(candle).every(Number.isFinite)) {
      byTime.set(candle.time, candle);
    }
  });

  return [...byTime.values()]
    .sort((a, b) => a.time - b.time)
    .slice(-limit);
};

const liveQuoteFor = (item) => {
  const quote = latestQuotes.get(item.ticker);
  const price = Number(quote?.price);
  const updatedAt = Date.parse(quote?.updatedAt);
  if (!Number.isFinite(price) || price <= 0) return null;
  if (Number.isFinite(updatedAt) && Date.now() - updatedAt > Math.max(STREAM_STALE_MS * 4, 60000)) return null;
  return { price, updatedAt: quote.updatedAt };
};

const applyLiveQuoteToCandles = (candles, item, timeframe, limit) => {
  const quote = liveQuoteFor(item);
  const seconds = timeframeSeconds(timeframe);
  if (!quote || !seconds) return candles || [];

  const price = quote.price;
  const time = bucketTime(Math.floor(Date.now() / 1000), timeframe);
  const nextCandles = [...(candles || [])]
    .filter((bar) => [bar.time, bar.open, bar.high, bar.low, bar.close].every((value) => Number.isFinite(Number(value))))
    .sort((a, b) => Number(a.time) - Number(b.time));
  const previous = nextCandles[nextCandles.length - 1];
  const previousTime = Number(previous?.time);

  if (Number.isFinite(previousTime) && previousTime === time) {
    nextCandles[nextCandles.length - 1] = {
      ...previous,
      high: Math.max(Number(previous.high), price),
      low: Math.min(Number(previous.low), price),
      close: price,
    };
    return nextCandles.slice(-limit);
  }

  if (Number.isFinite(previousTime) && previousTime > time) {
    return nextCandles.slice(-limit);
  }

  const open = Number.isFinite(Number(previous?.close)) ? Number(previous.close) : price;
  nextCandles.push({
    time,
    open,
    high: Math.max(open, price),
    low: Math.min(open, price),
    close: price,
  });
  return nextCandles.slice(-limit);
};

const deriveFromStoredSource = async (symbol, timeframe, limit, range = {}) => {
  const sourceTimeframe = DERIVED_CANDLE_SOURCES[timeframe];
  if (!['1m', '1D', '1M'].includes(sourceTimeframe)) return [];

  const secondsPerCandle = CANDLE_SECONDS[timeframe];
  const sourceSeconds = CANDLE_SECONDS[sourceTimeframe] || 60;
  if (!secondsPerCandle || !sourceSeconds) return [];

  const sourceLimit = Math.min(
    200000,
    Math.max(1000, Math.ceil(Math.min(limit, 50000) * secondsPerCandle / sourceSeconds))
  );
  const sourceRange = {};
  if (Number.isFinite(range.from)) sourceRange.from = range.from;
  if (Number.isFinite(range.to)) sourceRange.to = range.to;
  const sourceCandles = await readCandles(symbol, sourceTimeframe, sourceLimit, sourceRange).catch((error) => {
    console.warn(`Stored ${sourceTimeframe} candle read failed:`, error.message);
    return [];
  });
  return aggregateCandles(sourceCandles, timeframe).slice(-limit);
};

async function fetchRecentProviderCandles(item, timeframe, stored, limit) {
  if (!AUTO_CATCHUP_ENABLED || timeframe === '1s') return [];

  const seconds = timeframeSeconds(timeframe);
  if (!seconds) return [];

  const now = Math.floor(Date.now() / 1000);
  const latest = latestCandleTime(stored);
  const gapFrom = recentGapStart(stored, seconds, now);
  const isStale = !latest || now - latest > Math.max(seconds * 2, 300);
  const shouldRefreshRecent = AUTO_CATCHUP_ALWAYS_RECENT || isStale || gapFrom;
  if (!shouldRefreshRecent) return [];

  const key = `${item.symbol}:${timeframe}`;
  const lastRun = autoCatchupLastRun.get(key) || 0;
  if (Date.now() - lastRun < AUTO_CATCHUP_THROTTLE_MS) return [];

  if (autoCatchupLocks.has(key)) {
    return autoCatchupLocks.get(key);
  }

  const fromCandidates = [
    now - RECENT_CANDLE_LOOKBACK_SECONDS,
    gapFrom ? gapFrom - seconds : null,
    latest ? latest - seconds : null,
  ].filter((value) => Number.isFinite(value) && value > 0);
  const from = Math.max(
    Math.min(...fromCandidates),
    now - AUTO_CATCHUP_DAYS * 86400
  );
  const to = now + seconds;

  const task = fetchRecentCandles(item, timeframe, from, to, { save: RECENT_CANDLE_SAVE_ENABLED })
    .then((candles) => {
      if (AUTO_CATCHUP_LOGS_ENABLED && candles.length > 0) {
        console.log(`Fetched ${candles.length} recent provider candles for ${item.symbol} ${timeframe}`);
      }
      autoCatchupLastRun.set(key, Date.now());
      return candles.slice(-limit);
    })
    .catch((error) => {
      autoCatchupLastRun.set(key, Date.now());
      console.warn(`Recent provider candle fetch failed for ${item.symbol} ${timeframe}:`, error.message);
      return [];
    })
    .finally(() => {
      autoCatchupLocks.delete(key);
    });

  autoCatchupLocks.set(key, task);
  return task;
}

function scheduleRecentProviderCandles(item, timeframe, stored, limit, cacheKey) {
  fetchRecentProviderCandles(item, timeframe, stored, limit)
    .then((candles) => {
      if (candles.length && cacheKey) candleCache.delete(cacheKey);
    })
    .catch(() => {});
}

async function getHistoricalCandles(symbol, timeframe = '15m', limit = 240, options = {}) {
  const item = instruments.find((instrument) => instrument.symbol === symbol);
  if (!item) return [];
  if (timeframe === '1s') return [];
  const boundedLimit = Math.max(20, Math.min(Number(limit) || 240, 200000));
  const before = Number(options?.before);
  const range = Number.isFinite(before) && before > 0 ? { to: before } : {};
  const paged = Boolean(range.to);
  const key = `${symbol}:${timeframe}:${boundedLimit}:${range.to || 'latest'}`;
  const cached = candleCache.get(key);
  if (cached && Date.now() - cached.at < CANDLE_CACHE_MS) return cached.data;

  if (USE_CENTRAL_CANDLES) {
    if (!CENTRAL_CANDLE_API_URL || !CENTRAL_CANDLE_API_KEY) {
      throw new Error('Central candle source is enabled but not configured.');
    }
    const response = await axios.get(`${CENTRAL_CANDLE_API_URL}/candles/${encodeURIComponent(symbol)}`, {
      params: { timeframe, limit: boundedLimit, ...(range.to ? { before: range.to } : {}) },
      headers: { 'x-market-data-key': CENTRAL_CANDLE_API_KEY },
      timeout: 20000,
    });
    const candles = Array.isArray(response.data?.candles) ? response.data.candles : [];
    candleCache.set(key, { at: Date.now(), data: candles });
    return candles;
  }

  const stored = await readCandles(symbol, timeframe, boundedLimit, range).catch((error) => {
    console.warn('Stored candle read failed:', error.message);
    return [];
  });
  if (paged) {
    const derivedStoredCandles = await deriveFromStoredSource(symbol, timeframe, boundedLimit, range);
    const historical = mergeCandles(stored, derivedStoredCandles, boundedLimit);
    candleCache.set(key, { at: Date.now(), data: historical });
    return historical;
  }
  scheduleRecentProviderCandles(item, timeframe, stored, boundedLimit, key);
  const derivedStoredCandles = await deriveFromStoredSource(symbol, timeframe, boundedLimit);
  const currentStored = applyLiveQuoteToCandles(
    mergeCandles(stored, [], boundedLimit),
    item,
    timeframe,
    boundedLimit
  );
  const currentWithDerived = applyLiveQuoteToCandles(
    mergeCandles(currentStored, derivedStoredCandles, boundedLimit),
    item,
    timeframe,
    boundedLimit
  );

  if (item.group === 'CRYPTO CFD' && ['BINANCE:', 'COINBASE:'].some((prefix) => item.ticker.startsWith(prefix))) {
    const sourceTimeframe = DERIVED_CANDLE_SOURCES[timeframe];
    const needsDerivedCandles = (
      sourceTimeframe &&
      (currentWithDerived.length < Math.min(boundedLimit, 100) || !candlesAlignWithTimeframe(currentWithDerived, timeframe))
    );

    if (needsDerivedCandles) {
      const secondsPerCandle = CANDLE_SECONDS[timeframe] || 60;
      const sourceSeconds = CANDLE_SECONDS[sourceTimeframe] || 60;
      const sourceLimit = Math.min(200000, Math.max(1000, boundedLimit * Math.ceil(secondsPerCandle / sourceSeconds)));
      const sourceCandles = await readCandles(symbol, sourceTimeframe, sourceLimit).catch((error) => {
        console.warn(`Stored ${sourceTimeframe} candle read failed:`, error.message);
        return [];
      });
      const derived = aggregateCandles(sourceCandles, timeframe).slice(-boundedLimit);
      if (derived.length > 0) {
        const liveDerived = applyLiveQuoteToCandles(derived, item, timeframe, boundedLimit);
        candleCache.set(key, { at: Date.now(), data: liveDerived });
        return liveDerived;
      }
    }

    candleCache.set(key, { at: Date.now(), data: currentWithDerived });
    return currentWithDerived;
  }

  if (currentWithDerived.length > 0) {
    candleCache.set(key, { at: Date.now(), data: currentWithDerived });
    return currentWithDerived;
  }

  const candles = applyLiveQuoteToCandles(await requestCandles(item, timeframe, boundedLimit), item, timeframe, boundedLimit);
  candleCache.set(key, { at: Date.now(), data: candles });
  return candles;
}

module.exports = { instruments, getPrices, getPrice, getHistoricalCandles, startPriceStream };

