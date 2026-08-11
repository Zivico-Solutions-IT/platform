const router = require('express').Router();
const controller = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

const strictAdmin = (req, res, next) => {
  if (!['admin', 'master', 'manager'].includes(req.user?.role)) return res.status(403).json({ message: 'Strict Administrator access required.' });
  return next();
};

router.use(auth, admin);
router.get('/bonus-posts', strictAdmin, controller.bonusPosts);
router.post('/bonus-posts', strictAdmin, controller.createBonusPost);
router.delete('/bonus-posts/:id', strictAdmin, controller.deleteBonusPost);
router.get('/agents', strictAdmin, controller.agents);
router.get('/company-permissions', strictAdmin, controller.companyPermissions);
router.post('/agents', strictAdmin, controller.createAgent);
router.put('/agents/:id', strictAdmin, controller.updateAgent);
router.delete('/agents/:id', strictAdmin, controller.deleteAgent);

router.put('/profile', controller.updateProfile);
router.put('/profile/password', controller.updateProfilePassword);
router.get('/users', controller.users);
router.get('/birthdays', controller.birthdays);
router.post('/users/:id/impersonate', strictAdmin, controller.impersonateUser);
router.post('/users', controller.createUser);
router.put('/users/assign-agent', strictAdmin, controller.assignAgent);
router.put('/users/:id', controller.updateUserDetails);
router.delete('/users/:id', controller.deleteUser);
router.get('/users/:id/wallet', controller.userWallet);
router.get('/users/:id/transactions', controller.userTransactions);
router.get('/users/:id/overview', controller.userOverview);
router.get('/users/:id/verification', controller.userVerification);
router.put('/users/:id/add-balance', controller.updateBalance('admin_add_balance'));
router.put('/users/:id/deduct-balance', controller.updateBalance('admin_deduct_balance'));
router.put('/users/:id/leverage', controller.updateLeverage);
router.put('/users/:id/trading-level', controller.updateTradingLevel);
router.put('/users/:id/trading-status', controller.updateTradingStatus);
router.put('/users/:id/trading-accounts/:accountId/leverage', controller.updateTradingAccountLeverage);
router.put('/users/:id/trading-accounts/:accountId/status', controller.updateTradingAccountStatus);
router.put('/users/:id/trading-accounts/:accountId/reset-live', controller.resetLiveAccount);
router.put('/users/:id/reset-demo', controller.resetDemo);
router.put('/users/:id/notes', controller.updateNotes);
router.put('/users/:id/verification/approve', controller.reviewVerification('approved'));
router.put('/users/:id/verification/reject', controller.reviewVerification('rejected'));
router.get('/deposits', controller.deposits);
router.get('/deposit-method-addresses', controller.depositMethodAddresses);
router.post('/deposit-method-addresses', controller.createDepositMethodAddress);
router.put('/deposit-method-addresses/:id', controller.updateDepositMethodAddress);
router.delete('/deposit-method-addresses/:id', controller.deleteDepositMethodAddress);
router.get('/deposits/:id', controller.depositDetails);
router.put('/deposits/:id', controller.updateDeposit);
router.put('/deposits/:id/approve', controller.reviewDeposit('approved'));
router.put('/deposits/:id/reject', controller.reviewDeposit('rejected'));

router.get('/referral-rewards', controller.referralRewards);
router.put('/referral-rewards/:id/approve', controller.reviewReferralReward('approved'));
router.put('/referral-rewards/:id/reject', controller.reviewReferralReward('rejected'));
router.get('/withdrawals', controller.withdrawals);
router.put('/withdrawals/:id', controller.updateWithdrawal);
router.put('/withdrawals/:id/approve', controller.reviewWithdrawal('approved'));
router.put('/withdrawals/:id/reject', controller.reviewWithdrawal('rejected'));
router.get('/bank-accounts', controller.bankAccounts);
router.put('/bank-accounts/:id/approve', controller.reviewBankAccount('approved'));
router.put('/bank-accounts/:id/reject', controller.reviewBankAccount('rejected'));
router.get('/trades', controller.trades);
router.get('/historical-price', controller.getHistoricalPrice);
router.post('/trades/add-custom', controller.addCustomTrade);
router.get('/symbols', controller.getSymbols);
router.put('/symbols', controller.updateSymbols);

// Admin Notifications
router.get('/notifications', controller.getNotifications);
router.put('/notifications/mark-all-read', controller.markAllNotificationsRead);
router.put('/notifications/:id/read', controller.markNotificationRead);
router.delete('/notifications/:id', controller.deleteNotification);

module.exports = router;
