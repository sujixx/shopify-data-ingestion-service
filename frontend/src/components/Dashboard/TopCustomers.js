import React, { useEffect, useMemo, useState } from 'react';
import { dashboardAPI } from '../../services/api';
import './TopCustomers.css';

function formatMoney(value, currency = 'USD') {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value || 0);
  } catch {
    return `${currency} ${(value || 0).toLocaleString()}`;
  }
}

function TopCustomers() {
  const [payload, setPayload] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await dashboardAPI.getSummary();
        const data = res?.data?.data ?? res?.data ?? {};
        setPayload(data);
        setCurrency(
          data?.overview?.currency ||
          data?.currency ||
          'USD'
        );
      } catch (e) {
        setErr('Failed to fetch top customers data');
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const customers = useMemo(() => {
    if (!payload) return [];
    if (Array.isArray(payload.topCustomers) && payload.topCustomers.length) {
      return payload.topCustomers.slice(0, 5);
    }
    // Fallback: build from recentOrders
    if (Array.isArray(payload.recentOrders)) {
      const agg = new Map();
      for (const o of payload.recentOrders) {
        const key = o?.customer?.email || o?.email || 'guest';
        const name = `${o?.customer?.firstName ?? ''} ${o?.customer?.lastName ?? ''}`.trim();
        const spent = Number(o?.totalPrice ?? o?.total_price ?? 0);
        if (!agg.has(key)) agg.set(key, { id: key, email: key, name, totalSpent: 0 });
        agg.get(key).totalSpent += spent;
      }
      return Array.from(agg.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);
    }
    return [];
  }, [payload]);

  if (loading) return <div className="top-customers loading">Loading…</div>;
  if (err) return <div className="top-customers error">{err}</div>;

  return (
    <div className="top-customers">
      <h3>Top 5 Customers by Spend</h3>
      <div className="customers-list">
        {customers.length ? customers.map((c, i) => (
          <div className="customer-item" key={c.id || c.email || i}>
            <span className="rank">{i + 1}</span>
            <div className="customer-info">
              <div className="name">{c.name || c.email || 'Guest'}</div>
              <div className="email">{c.email || ''}</div>
            </div>
            <div className="spend">{formatMoney(c.totalSpent, currency)}</div>
          </div>
        )) : <p>No customer data available</p>}
      </div>
    </div>
  );
}

export default TopCustomers;
