// src/components/Dashboard/SummaryCards.js
import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import './SummaryCards.css';

// One formatter instance (avoids recreating on every render)
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});
const formatUSD = (n) => usd.format(Number(n) || 0);

function SummaryCards() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await dashboardAPI.getSummary(); // axios response
        if (!mounted) return;
        // Normalize: accept either { success, data: {...} } or raw payload
        const payload = res?.data ?? res;
        setSummary(payload?.data ?? payload);
      } catch (err) {
        if (!mounted) return;
        console.error('Summary fetch failed:', err);
        setError('Failed to fetch summary data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="summary-cards loading">Loading...</div>;
  if (error) return <div className="summary-cards error">{error}</div>;

  const totals = summary?.overview || {};

  return (
    <div className="summary-cards">
      <div className="card">
        <h3>Total Customers</h3>
        <p className="value">{totals?.totalCustomers ?? 0}</p>
      </div>

      <div className="card">
        <h3>Total Orders</h3>
        <p className="value">{totals?.totalOrders ?? 0}</p>
      </div>

      <div className="card">
        <h3>Total Revenue</h3>
        <p className="value">{formatUSD(totals?.totalRevenue)}</p>
      </div>

      <div className="card">
        <h3>Avg Order Value</h3>
        <p className="value">{formatUSD(totals?.avgOrderValue)}</p>
      </div>
    </div>
  );
}

export default SummaryCards;
