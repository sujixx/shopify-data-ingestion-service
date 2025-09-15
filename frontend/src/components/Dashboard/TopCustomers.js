import React, { useEffect, useMemo, useState } from 'react';
import { dashboardAPI } from '../../services/api';
import './TopCustomers.css';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function TopCustomers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [raw, setRaw] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await dashboardAPI.getSummary();
        if (mounted) setRaw(res.data || res); // support {success,data} or plain
      } catch (e) {
        console.error(e);
        if (mounted) setError('Failed to fetch dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!raw) return [];

    // 1) Try backend-provided topCustomers if it has meaningful totals
    const backend = Array.isArray(raw.topCustomers) ? raw.topCustomers : [];
    const hasRealTotals = backend.some((c) => Number(c.totalSpent) > 0);

    if (hasRealTotals) {
      return backend
        .map((c) => ({
          id: c.id || c.shopifyCustomerId || c.email || Math.random().toString(36),
          name:
            c.firstName || c.lastName
              ? `${c.firstName || ''} ${c.lastName || ''}`.trim()
              : c.email || 'Unknown',
          email: c.email || '—',
          total: Number(c.totalSpent) || 0,
          orders: Number(c.ordersCount) || 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    }

    // 2) Fallback: derive from recentOrders (sum by customer email)
    const orders = Array.isArray(raw.recentOrders) ? raw.recentOrders : [];
    const map = new Map();
    for (const o of orders) {
      const email = o.email || o.customer?.email || 'Guest';
      const key = email.toLowerCase();
      const prev = map.get(key) || { name: email, email, total: 0, orders: 0 };
      map.set(key, {
        ...prev,
        // Sum by order total
        total: prev.total + (Number(o.totalPrice) || 0),
        orders: prev.orders + 1,
      });
    }

    return Array.from(map.values())
      .filter((r) => r.email !== 'Guest') // keep known customers for “Top” panel
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((r, i) => ({ id: r.email || i, ...r }));
  }, [raw]);

  if (loading) return <div className="top-customers loading">Loading…</div>;
  if (error) return <div className="top-customers error">{error}</div>;

  return (
    <div className="top-customers">
      <h3>Top 5 Customers by Spend</h3>
      <div className="customers-list">
        {rows.length > 0 ? (
          rows.map((c, idx) => (
            <div key={c.id} className="customer-item">
              <span className="rank">{idx + 1}</span>
              <div className="customer-info">
                <div className="name">{c.name}</div>
                <div className="email">{c.email}</div>
              </div>
              <div className="spend">{usd.format(c.total || 0)}</div>
            </div>
          ))
        ) : (
          <p>No customer data yet</p>
        )}
      </div>
    </div>
  );
}
