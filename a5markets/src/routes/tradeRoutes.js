const router = require('express').Router();
const controller = require('../controllers/tradeController');
const auth = require('../middleware/authMiddleware');

router.use(auth);
router.post('/open', controller.open);
router.patch('/risk/:id', controller.updateRisk);
router.post('/close/:id', controller.close);
router.post('/cancel/:id', controller.cancel);
router.get('/open', controller.openTrades);
router.get('/pending', controller.pendingTrades);
router.get('/closed', controller.closedTrades);

module.exports = router;
