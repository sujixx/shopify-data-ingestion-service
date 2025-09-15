import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Don’t hard crash during build; only redirect in browser
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- Helpers (fallback calculations) ----
const toISODate = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  const z = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
  return z.toISOString().slice(0, 10);
};

const groupOrdersByDay = (orders = [], startDate, endDate) => {
  const counts = new Map();
  orders.forEach((o) => {
    const date =
      toISODate(o.date || o.processedAt || o.createdAt || o.created_at) || null;
    if (!date) return;
    if (startDate && date < startDate) return;
    if (endDate && date > endDate) return;
    counts.set(date, (counts.get(date) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};

const topCustomersFromOrders = (orders = [], limit = 5) => {
  const byEmail = new Map();
  orders.forEach((o) => {
    const email =
      o?.customer?.email || o?.email || o?.customerEmail || 'guest@unknown';
    const firstName = o?.customer?.firstName || o?.customer?.first_name || '';
    const lastName = o?.customer?.lastName || o?.customer?.last_name || '';
    const amount = Number(o?.totalPrice ?? o?.total_price ?? 0) || 0;

    const curr = byEmail.get(email) || {
      id: email,
      email,
      name: [firstName, lastName].filter(Boolean).join(' ').trim() || email,
      totalSpent: 0,
      ordersCount: 0,
      lastOrderDate: null,
    };
    curr.totalSpent += amount;
    curr.ordersCount += 1;
    const d = toISODate(o.date || o.processedAt || o.createdAt || o.created_at);
    if (d && (!curr.lastOrderDate || d > curr.lastOrderDate)) curr.lastOrderDate = d;
    byEmail.set(email, curr);
  });

  return Array.from(byEmail.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
};

export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
};

export const dashboardAPI = {
  /**
   * Primary source of truth. Your backend already provides it.
   * This function normalizes shape whether backend returns {success, data} or the object directly.
   */
  getSummary: async () => {
    const res = await api.get('/api/analytics/dashboard');
    const payload = res?.data;
    const normalized = payload?.data ?? payload ?? {};
    // Ensure keys exist so UI never crashes
    return {
      data: {
        overview: normalized.overview || {
          totalCustomers: 0,
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
        },
        today: normalized.today || { orders: 0, revenue: 0 },
        recentOrders: normalized.recentOrders || [],
        topCustomers: normalized.topCustomers || [],
        dailyRevenue: normalized.dailyRevenue || [], // [{date, revenue, orderCount}]
        ordersByDate: normalized.ordersByDate || [], // if you have it
      },
      success: true,
    };
  },

  /**
   * Resilient Orders By Date:
   * 1) Try dedicated endpoint.
   * 2) If 404/501/etc, derive from recentOrders in the summary.
   */
  getOrdersByDate: async (startDate, endDate) => {
    try {
      const res = await api.get(
        `/api/analytics/orders-by-date?startDate=${startDate}&endDate=${endDate}`
      );
      return res.data;
    } catch {
      // derive from summary
      const s = await dashboardAPI.getSummary();
      const derived = groupOrdersByDay(s.data.recentOrders, startDate, endDate);
      return derived;
    }
  },

  /**
   * Resilient Top Customers:
   * 1) Try dedicated endpoint.
   * 2) If not present, use summary.topCustomers.
   * 3) If still missing, derive from recentOrders.
   */
  getTopCustomers: async () => {
    try {
      const res = await api.get('/api/analytics/top-customers');
      return res.data;
    } catch {
      const s = await dashboardAPI.getSummary();
      if (Array.isArray(s.data.topCustomers) && s.data.topCustomers.length) {
        return s.data.topCustomers;
      }
      // derive from orders
      return topCustomersFromOrders(s.data.recentOrders, 5);
    }
  },
};

export const shopifyAPI = {
  connectStore: (shopifyDomain) => api.post('/api/shopify/connect', { shopifyDomain }),
  startAuth: (shop) =>
    (window.location.href = `${process.env.REACT_APP_SHOPIFY_APP_URL}/auth?shop=${shop}`),
  syncData: (resources) => api.post('/api/shopify/sync', { resources }),
};

export default api;
