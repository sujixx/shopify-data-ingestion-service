import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SummaryCards from './SummaryCards';
import OrdersChart from './OrdersChart';
import TopCustomers from './TopCustomers';
import StoreConnection from '../Store/StoreConnection';
import AIInsightsPanel from './AIInsightsPanel';
import { dashboardAPI, shopifyAPI } from '../../services/api';
import './Dashboard.css';

function AutoBackfillOnce() {
  const [ran, setRan] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === 'undefined') return;
        if (localStorage.getItem('syncedOnce') === 'true') return;

        const res = await dashboardAPI.getSummary();
        const s = res?.data || res || {};
        const totals =
          Number(s?.overview?.totalCustomers || 0) +
          Number(s?.overview?.totalOrders || 0) +
          Number(s?.overview?.totalRevenue || 0);

        if (totals === 0) {
          await shopifyAPI.syncData(['customers', 'orders', 'products']);
        }
        localStorage.setItem('syncedOnce', 'true');
        if (!cancelled) setRan(true);
      } catch {
        // silent; UI still works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ran ? null : null;
}

function Dashboard() {
  // ✅ Call hooks UNCONDITIONALLY at the very top
  const auth = useAuth();                   // no conditional/optional call
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // theme + token init always runs (no conditional hooks)
    if (typeof window !== 'undefined') {
      setHasToken(!!localStorage.getItem('token'));
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') document.body.classList.add('dark');
    }
  }, []);

  // After hooks: guard route
  if (!auth || !hasToken) return <Navigate to="/login" replace />;

  const { currentUser, logout } = auth;

  const toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  return (
    <div className="dashboard">
      <AutoBackfillOnce />

      <header className="dashboard-header">
        <div className="container header-inner">
          <h1>Shopify Insights Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {currentUser?.email}</span>
            <button onClick={toggleTheme} className="btn btn-secondary">Theme</button>
            <button onClick={logout} className="btn btn-secondary">Logout</button>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="container">
          <StoreConnection />
          <SummaryCards />

          {/* AI-style insights (client-side computed) */}
          <AIInsightsPanel />

          <div className="charts-row">
            <div className="chart-container">
              <OrdersChart />
            </div>
            <div className="chart-container">
              <TopCustomers />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
