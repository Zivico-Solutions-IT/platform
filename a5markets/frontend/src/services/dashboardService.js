import api from './api';

const inFlightRequests = new Map();

const shareRequest = (key, request) => {
  const current = inFlightRequests.get(key);
  if (current) return current;

  const promise = request().finally(() => {
    if (inFlightRequests.get(key) === promise) inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
};

export const dashboardService = {
  // The header, dashboard and slide-over panels can all need this data at
  // the same time. Share the active request instead of opening duplicates.
  getDashboard: () => shareRequest('dashboard', () => api.get('/dashboard').then((response) => response.data)),
  getAccounts: () => shareRequest('accounts', () => api.get('/dashboard/accounts').then((response) => response.data)),
  createAccount: (type, confirmed = false) => api.post('/dashboard/accounts', { type, confirmed }).then((response) => response.data),
};
