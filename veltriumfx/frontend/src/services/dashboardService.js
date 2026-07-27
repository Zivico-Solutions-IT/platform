import api from './api';

export const dashboardService = {
  getDashboard: () => api.get('/dashboard').then((response) => response.data),
  createAccount: (type, confirmed = false) => api.post('/dashboard/accounts', { type, confirmed }).then((response) => response.data),
};
