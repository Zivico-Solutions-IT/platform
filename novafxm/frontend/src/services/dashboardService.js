import api from './api';

// Several portal components need the same account summary on first render.
// Share an in-flight request so mounting the header, a panel, and a page at
// the same time cannot flood the API and delay the chart request.
let dashboardRequest = null;
let accountsRequest = null;

const sharedRequest = (current, create, clear) => {
  if (current) return current;
  const request = create().finally(clear);
  return request;
};

export const dashboardService = {
  getDashboard: () => {
    dashboardRequest = sharedRequest(
      dashboardRequest,
      () => api.get('/dashboard').then((response) => response.data),
      () => { dashboardRequest = null; },
    );
    return dashboardRequest;
  },
  getAccounts: () => {
    accountsRequest = sharedRequest(
      accountsRequest,
      () => api.get('/dashboard/accounts').then((response) => response.data),
      () => { accountsRequest = null; },
    );
    return accountsRequest;
  },
  createAccount: (type, confirmed = false) => api.post('/dashboard/accounts', { type, confirmed }).then((response) => response.data),
};
