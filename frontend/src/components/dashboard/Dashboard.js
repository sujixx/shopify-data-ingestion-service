import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SummaryCards from './SummaryCards';
import OrdersChart from './OrdersChart';
import TopCustomers from './TopCustomers';
import StoreConnection from '../Store';
import './Dashboard.css';

function Dashboard() {
  const { currentUser, logout } = useAuth();

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

export default Dashboard;