import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import './SummaryCards.css';

// Simple INR formatter (works even if numbers come in as strings)
const formatINR = (n) =>
  (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function SummaryCards() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      try {
        const res = await dashboardAPI.getSummary();
        if (!isMounted) return;
        setSummary(res.data || res); // support both {data} and raw payload
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to fetch summary data');
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSummary();
    return () => { isMounted = false; };
  }, []);

  if (loading) return <div className="summary-cards loading">Loading...</div>;
  if (error) return <div className="summary-cards error">{error}</div>;

  const totals = summary?.overview || {};
  const currencySymbol = '₹'; // display-only; backend numbers stay as-is

  return (
    <div className="summary-cards">
      <div className="card">
        <h3>Total Customers</h3>
        <p className="value">{totals.totalCustomers ?? 0}</p>
      </div>

      <div className="card">
        <h3>Total Orders</h3>
        <p className="value">{totals.totalOrders ?? 0}</p>
      </div>

      <div className="card">
        <h3>Total Revenue</h3>
        <p className="value">
          {currencySymbol}{formatINR(totals.totalRevenue)}
        </p>
      </div>

      <div className="card">
        <h3>Avg Order Value</h3>
        <p className="value">
          {currencySymbol}{formatINR(totals.avgOrderValue)}
        </p>
      </div>
    </div>
  );
}

export default SummaryCards;
