const router = require('express').Router();
const controller = require('../controllers/dashboardController');
const auth = require('../middleware/authMiddleware');

router.use(auth);
router.get('/', controller.dashboard);
router.get('/accounts', controller.accounts);
router.post('/accounts', controller.createAccount);

module.exports = router;
