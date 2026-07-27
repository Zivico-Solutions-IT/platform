const router = require('express').Router();
const controller = require('../controllers/walletController');
const auth = require('../middleware/authMiddleware');

router.use(auth);
router.get('/', controller.getWallet);
router.post('/claim-birthday-bonus', controller.claimBirthdayBonus);
router.get('/transactions', controller.transactions);
router.get('/deposit-methods', controller.depositMethods);
router.post('/deposit', controller.deposit);
router.post('/withdraw', controller.withdraw);

module.exports = router;
