const router = require('express').Router();
const controller = require('../controllers/marketController');
const auth = require('../middleware/authMiddleware');

// Server-to-server candle feed for the other company backends. This is kept
// separate from client JWT authentication and is protected by a shared secret.
const internalMarketAuth = (req, res, next) => {
  const expected = String(process.env.MARKET_DATA_INTERNAL_KEY || '');
  const supplied = String(req.get('x-market-data-key') || '');
  if (!expected || supplied !== expected) return res.status(401).json({ message: 'Market data access denied.' });
  return next();
};

router.get('/internal/candles/*', internalMarketAuth, controller.candles);
router.use(auth);
router.get('/symbols', controller.symbols);
router.get('/prices', controller.prices);
router.get('/candles/*', controller.candles);

module.exports = router;
