import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import SummaryCards from './SummaryCards';
import OrdersChart from './OrdersChart';
import TopCustomers from './TopCustomers';
import StoreConnection from '../Store';
import './Dashboard.css';

export default function Dashboard() {
  // Get auth context (can be null briefly while the app boots)
  const auth = useAuth();

  // 1) Safety: if context isn't mounted yet, send to login (or show a loader)
  if (!auth) return <Navigate to="/login" replace />;

  const { currentUser, logout, ready, isAuthenticated } = auth;

  // 2) While AuthProvider is initializing (reading localStorage), show a loader
  if (!ready) {
    return (
      <div className="dashboard">
        <div className="loading">Loading…</div>
      </div>
    );
  }

  // 3) If user isn’t authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 4) (Optional extra check) If there’s no token in localStorage, redirect
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 5) Normal render once authenticated
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
