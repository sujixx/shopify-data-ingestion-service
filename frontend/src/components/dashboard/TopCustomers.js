import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import './TopCustomers.css';

function TopCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTopCustomers = async () => {
      try {
        const response = await dashboardAPI.getTopCustomers();
        setCustomers(response.data);
      } catch (err) {
        setError('Failed to fetch top customers data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopCustomers();
  }, []);

  if (loading) return <div className="top-customers loading">Loading...</div>;
  if (error) return <div className="top-customers error">{error}</div>;

  return (
    <div className="top-customers">
      <h3>Top 5 Customers by Spend</h3>
      <div className="customers-list">
        {customers.length > 0 ? (
          customers.map((customer, index) => (
            <div key={customer.id} className="customer-item">
              <span className="rank">{index + 1}</span>
              <div className="customer-info">
                <div className="name">{customer.name || customer.email}</div>
                <div className="email">{customer.email}</div>
              </div>
              <div className="spend">${customer.totalSpent?.toLocaleString() || 0}</div>
            </div>
          ))
        ) : (
          <p>No customer data available</p>
        )}
      </div>
    </div>
  );
}

export default TopCustomers;