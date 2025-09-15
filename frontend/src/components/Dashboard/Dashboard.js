import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SummaryCards from './SummaryCards';
import OrdersChart from './OrdersChart';
import TopCustomers from './TopCustomers';
// If you DIDN'T create components/Store/index.js, switch this to:
//   import StoreConnection from '../Store/StoreConnection';
import StoreConnection from '../Store';
import './Dashboard.css';

function Dashboard() {
  const auth = useAuth();

  // Belt & suspenders: if context isn't available yet OR not authenticated,
  // send to /login (prevents the "cannot destructure currentUser" crash and blank screens)
  const hasToken =
    typeof window !== 'undefined' && !!localStorage.getItem('token');

  if (!auth || !auth.isAuthenticated || !hasToken) {
    return <Navigate to="/login" replace />;
  }

  const { currentUser, logout } = auth;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <h1>Shopify Insights Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {currentUser?.email}</span>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="container">
          <StoreConnection />
          <SummaryCards />
          <div className="charts-row">
            <div className="chart-container"><OrdersChart /></div>
            <div className="chart-container"><TopCustomers /></div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
