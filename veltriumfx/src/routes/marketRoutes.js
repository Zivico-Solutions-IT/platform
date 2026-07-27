const router = require('express').Router();
const controller = require('../controllers/marketController');
const auth = require('../middleware/authMiddleware');

router.use(auth);
router.get('/symbols', controller.symbols);
router.get('/prices', controller.prices);
router.get('/candles/*', controller.candles);

module.exports = router;
