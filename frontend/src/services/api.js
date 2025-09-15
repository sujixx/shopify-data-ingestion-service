import axios from 'axios';

// Single source of truth for the backend URL, with safe fallback.
const DEFAULT_API_BASE =
  (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) ||
  'https://shopify-data-ingestion-service-production.up.railway.app';

export const getApiBaseUrl = () => DEFAULT_API_BASE;

const api = axios.create({
  baseURL: DEFAULT_API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// On 401, bounce to /login — but not for the login call itself.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const reqUrl = error?.config?.url || '';
    const isLogin = reqUrl.includes('/api/auth/login');
    if (status === 401 && !isLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
    const base =
      (process.env.REACT_APP_SHOPIFY_APP_URL && process.env.REACT_APP_SHOPIFY_APP_URL.trim()) ||
      `${DEFAULT_API_BASE}/api/shopify`;
    window.location.href = `${base}/auth?shop=${shop}`;
  },
  syncData: (resources) => api.post('/api/shopify/sync', { resources }),
};

export default api;
