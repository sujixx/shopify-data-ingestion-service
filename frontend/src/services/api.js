// src/services/api.js
import axios from 'axios';

// Use Vercel proxy in production; env var on localhost
function getBaseURL() {
  if (typeof window !== 'undefined') {
    const host = window.location.host || '';
    const isVercel = host.endsWith('.vercel.app');
    if (isVercel) return '/'; // so requests go to /api/* and get rewritten
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:3000';
}

const API_BASE_URL = getBaseURL();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Debug which baseURL you’re on
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.log('[API] baseURL =', API_BASE_URL, '| origin =', window.location.origin);
}

export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
};

export const dashboardAPI = {
  getSummary: () => api.get('/api/analytics/dashboard'),
  getOrdersByDate: (startDate, endDate) =>
    api.get('/api/analytics/orders-by-date', { params: { startDate, endDate } }),
  getTopCustomers: () => api.get('/api/analytics/top-customers'),
};

export const shopifyAPI = {
  connectStore: (shopifyDomain) => api.post('/api/shopify/connect', { shopifyDomain }),
  startAuth: (shop) => {
    const base = '/api/shopify';
    window.location.href = `${base}/auth?shop=${encodeURIComponent(shop)}`;
  },
  syncData: (resources) => api.post('/api/shopify/sync', { resources }),
};

export default api;
