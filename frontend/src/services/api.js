import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || "";  // keep "" to use same-origin + rewrite


// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
    api.get(`/api/analytics/orders-by-date?startDate=${startDate}&endDate=${endDate}`),
  getTopCustomers: () => api.get('/api/analytics/top-customers'),
};

export const shopifyAPI = {
  connectStore: (shopifyDomain) => 
    api.post('/api/shopify/connect', { shopifyDomain }),
  startAuth: (shop) => 
    window.location.href = `${process.env.REACT_APP_SHOPIFY_APP_URL}/auth?shop=${shop}`,
  syncData: (resources) => 
    api.post('/api/shopify/sync', { resources }),
};

export default api;