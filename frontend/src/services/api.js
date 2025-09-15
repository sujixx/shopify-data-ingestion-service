import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || ''; // "" => same-origin (Vercel routes proxy)
const api = axios.create({ baseURL: API_BASE_URL });

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear and bounce to /login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// -------------------- helpers --------------------
const toDateStr = (d) => {
  try {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return x.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

function groupOrdersByDate(orders, startDate, endDate) {
  const map = new Map();
  (orders || []).forEach((o) => {
    const dRaw = o.date || o.processedAt || o.createdAt || o.created_at;
    const date = toDateStr(dRaw);
    if (!date) return;
    if (startDate && date < startDate) return;
    if (endDate && date > endDate) return;
    map.set(date, (map.get(date) || 0) + 1);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function normalizeSummary(root) {
  // root is either {success, data:{...}} or {...} directly
  const s = root?.data ?? root ?? {};

  // Overview/totals
  const ov = s.overview || {};
  const totalCustomers =
    ov.totalCustomers ?? ov.total_customers ?? ov.customers ?? 0;
  const totalOrders =
    ov.totalOrders ?? ov.total_orders ?? ov.orders ?? 0;
  const totalRevenue =
    Number(ov.totalRevenue ?? ov.total_revenue ?? ov.revenue ?? 0) || 0;

  // Try to compute AOV if not provided
  const aovFromTotals =
    totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgOrderValue =
    Number(ov.avgOrderValue ?? ov.avg_order_value ?? aovFromTotals) || 0;

  // Lists provided by backend
  const recentOrders =
    s.recentOrders ?? s.recent_orders ?? s.orders ?? [];
  const topCustomersRaw =
    s.topCustomers ?? s.top_customers ?? [];

  // dailyRevenue might be [{date, revenue, orders?}] (your backend shows it)
  const dailyRevenue =
    s.dailyRevenue ?? s.daily_revenue ?? [];

  // Normalize top customers
  const topCustomers = (topCustomersRaw || []).map((c) => ({
    id: c.id ?? c.email ?? c.shopifyCustomerId ?? c.shopify_customer_id,
    name:
      c.name ||
      [c.firstName ?? c.first_name, c.lastName ?? c.last_name].filter(Boolean).join(' ') ||
      c.email,
    email: c.email,
    totalSpent: Number(c.totalSpent ?? c.total_spent ?? c.spent ?? 0) || 0,
  }));

  // Prefer orders count embedded in dailyRevenue; else derive from recentOrders
  let ordersByDate = [];
  if (Array.isArray(dailyRevenue) && dailyRevenue.length) {
    ordersByDate = dailyRevenue.map((r) => ({
      date: r.date || r.day || toDateStr(r.timestamp),
      count:
        r.orders ??
        r.count ??
        0,
    })).filter(x => x.date);
  }
  if (!ordersByDate.length) {
    ordersByDate = groupOrdersByDate(recentOrders);
  }

  return {
    totalCustomers,
    totalOrders,
    totalRevenue,
    avgOrderValue,
    ordersByDate,     // [{date, count}]
    topCustomers,     // [{id,name,email,totalSpent}]
    recentOrders,     // keep raw for any future component
  };
}

// -------------------- exported APIs --------------------
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
};

export const dashboardAPI = {
  // Always normalize so components can read response.data.* consistently
  getSummary: async () => {
    const res = await api.get('/api/analytics/dashboard');
    const normalized = normalizeSummary(res.data);
    return { data: normalized }; // keep axios-like shape for existing components
  },

  // Try dedicated endpoint; on 4xx/5xx fallback to normalized summary
  getOrdersByDate: async (startDate, endDate) => {
    try {
      const res = await api.get(
        `/api/analytics/orders-by-date?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );
      return res;
    } catch (error) {
      const status = error?.response?.status;
      if (!status || [404, 400, 501, 500].includes(status)) {
        const summary = await dashboardAPI.getSummary();
        // Filter the normalized series by date range
        const filtered = (summary.data.ordersByDate || []).filter((p) => {
          return (!startDate || p.date >= startDate) &&
                 (!endDate || p.date <= endDate);
        });
        return { data: filtered };
      }
      throw error;
    }
  },

  getTopCustomers: async () => {
    try {
      return await api.get('/api/analytics/top-customers');
    } catch (error) {
      const status = error?.response?.status;
      if (!status || [404, 400, 501, 500].includes(status)) {
        const summary = await dashboardAPI.getSummary();
        return { data: summary.data.topCustomers || [] };
      }
      throw error;
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
