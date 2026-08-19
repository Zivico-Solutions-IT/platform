import api from './api';

export const authService = {
  // Registration creates a user, wallet and trading account and hashes the
  // password. A busy production database can take longer than the generic
  // API timeout, so do not show a false "backend is running" error at 9s.
  register: (values) => api.post('/auth/register', values, { timeout: 45000 }).then((response) => response.data),
  verifyEmail: (values) => api.post('/auth/verify-email', values, { timeout: 45000 }).then((response) => response.data),
  resendEmailVerification: (values) => api.post('/auth/resend-email-verification', values, { timeout: 45000 }).then((response) => response.data),
  login: (values) => api.post('/auth/login', values).then((response) => response.data),
  presence: () => api.post('/auth/presence').then((response) => response.data),
  offline: () => api.post('/auth/offline').then((response) => response.data),
  forgotPassword: (values) => api.post('/auth/forgot-password', values).then((response) => response.data),
  resetPassword: (values) => api.post('/auth/reset-password', values).then((response) => response.data),
  // Profile data is small, but a busy shared database can occasionally take
  // longer than the generic API timeout. Keep the authenticated session
  // refresh alive instead of silently retaining stale verification status.
  me: () => api.get('/auth/me', { timeout: 45000 }).then((response) => response.data),
  updateProfile: (values) => api.put('/users/profile', values).then((response) => response.data),
  changePassword: (values) => api.put('/users/password', values).then((response) => response.data),
  updateBankDetails: (values) => api.put('/users/bank-details', values).then((response) => response.data),
  deleteBankDetails: () => api.delete('/users/bank-details').then((response) => response.data),
  listBankAccounts: () => api.get('/users/bank-accounts').then((response) => response.data),
  createBankAccount: (values) => api.post('/users/bank-accounts', values).then((response) => response.data),
  updateBankAccount: (id, values) => api.put(`/users/bank-accounts/${id}`, values).then((response) => response.data),
  deleteBankAccount: (id) => api.delete(`/users/bank-accounts/${id}`).then((response) => response.data),
  submitVerification: (values) => api.post('/users/verification', values).then((response) => response.data),
};
