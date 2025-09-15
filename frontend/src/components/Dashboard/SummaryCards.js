import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '../../services/api';
import './SummaryCards.css';

function formatMoney(value, currency = 'USD') {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value || 0);
  } catch {
    return `${currency} ${(value || 0).toLocaleString()}`;
  }
}

function SummaryCards() {
  const [data, setData] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await dashboardAPI.getSummary();
        // support either {success, data} or direct payload
        const payload = res?.data?.data ?? res?.data ?? {};
        setData(payload);
        setCurrency(
          payload?.overview?.currency ||
          payload?.currency ||
          'USD'
        );
      } catch (e) {
        setErr('Failed to fetch summary data');
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="summary-cards loading">Loading…</div>;
  if (err) return <div className="summary-cards error">{err}</div>;

  const totalCustomers = data?.overview?.totalCustomers ?? 0;
  const totalOrders    = data?.overview?.totalOrders ?? 0;
  const totalRevenue   = data?.overview?.totalRevenue ?? 0;
  const avgOrderValue  = data?.overview?.avgOrderValue ?? (totalOrders ? totalRevenue / totalOrders : 0);

  return (
    <div className="summary-cards">
      <div className="card">
        <h3>Total Customers</h3>
        <p className="value">{totalCustomers}</p>
      </div>
      <div className="card">
        <h3>Total Orders</h3>
        <p className="value">{totalOrders}</p>
      </div>
      <div className="card">
        <h3>Total Revenue</h3>
        <p className="value">{formatMoney(totalRevenue, currency)}</p>
      </div>
      <div className="card">
        <h3>Avg Order Value</h3>
        <p className="value">{formatMoney(avgOrderValue, currency)}</p>
      </div>
    </div>
  );
}

export default SummaryCards;
