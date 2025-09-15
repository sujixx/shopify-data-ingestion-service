import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import './SummaryCards.css';

function SummaryCards() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await dashboardAPI.getSummary();
        setSummary(response.data);
      } catch (err) {
        setError('Failed to fetch summary data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) return <div className="summary-cards loading">Loading...</div>;
  if (error) return <div className="summary-cards error">{error}</div>;

  return (
    <div className="summary-cards">
      <div className="card">
        <h3>Total Customers</h3>
        <p className="value">{summary?.totalCustomers || 0}</p>
      </div>
      
      <div className="card">
        <h3>Total Orders</h3>
        <p className="value">{summary?.totalOrders || 0}</p>
      </div>
      
      <div className="card">
        <h3>Total Revenue</h3>
        <p className="value">${summary?.totalRevenue?.toLocaleString() || 0}</p>
      </div>
      
      <div className="card">
        <h3>Avg Order Value</h3>
        <p className="value">${summary?.avgOrderValue?.toFixed(2) || 0}</p>
      </div>
    </div>
  );
}

export default SummaryCards;