import api from './api';

export const walletService = {
  getWallet: (tradingAccountId) => api.get('/wallet', { params: tradingAccountId ? { tradingAccountId } : undefined }).then((response) => response.data),
  getTransactions: () => api.get('/wallet/transactions').then((response) => response.data),
  getDepositMethods: () => api.get('/wallet/deposit-methods').then((response) => response.data),
  deposit: (values) => api.post('/wallet/deposit', values).then((response) => response.data),
  withdraw: (values) => api.post('/wallet/withdraw', values).then((response) => response.data),
  claimBirthdayBonus: () => api.post('/wallet/claim-birthday-bonus').then((response) => response.data),
};
