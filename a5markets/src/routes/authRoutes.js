const router = require('express').Router();
const controller = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

router.post('/register', controller.register);
router.get('/registration-status', controller.registrationStatus);
router.post('/login', controller.login);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.get('/me', auth, controller.me);
router.post('/presence', auth, controller.presence);
router.post('/offline', auth, controller.offline);

module.exports = router;
