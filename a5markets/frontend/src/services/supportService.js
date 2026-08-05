import api from './api';

export const supportService = {
  sendMessage: (history) => api.post('/support/chat', { history }).then((response) => response.data),
};
