import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SummaryCards from './SummaryCards';
import OrdersChart from './OrdersChart';
import TopCustomers from './TopCustomers';
import StoreConnection from '../Store/StoreConnection';
import AIInsightsPanel from './AIInsightsPanel';
import './Dashboard.css';

function Dashboard() {
  // Safe to use directly because App guards the route
  const { currentUser, logout } = useAuth();

  const toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  // Honor saved theme once mounted
  React.useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.body.classList.add('dark');
  }, []);

  return (
    <div className="dashboard">
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

          {/* Optional “wow” panel that computes lightweight client-side insights */}
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
