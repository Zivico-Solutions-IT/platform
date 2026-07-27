const router = require('express').Router();
const controller = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

router.use(auth);
router.get('/profile', controller.profile);
router.put('/profile', controller.updateProfile);
router.put('/password', controller.changePassword);
router.put('/bank-details', controller.updateBankDetails);
router.delete('/bank-details', controller.deleteBankDetails);
router.get('/bank-accounts', controller.listBankAccounts);
router.post('/bank-accounts', controller.createBankAccount);
router.put('/bank-accounts/:id', controller.updateBankAccount);
router.delete('/bank-accounts/:id', controller.deleteBankAccount);
router.post('/verification', controller.submitVerification);

module.exports = router;
