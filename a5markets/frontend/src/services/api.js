import axios from 'axios';
import { storage } from '../utils/storage';
import { apiBaseUrl } from './apiConfig';

const api = axios.create({
  baseURL: apiBaseUrl(),
  timeout: 9000,
});

api.interceptors.request.use(async (config) => {
  const token = await storage.get('token');
  const projectId = await storage.get('x-project-id');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  if (projectId) {
    config.headers['x-project-id'] = projectId;
  } else {
    delete config.headers['x-project-id'];
  }

  return config;
});

export default api;
