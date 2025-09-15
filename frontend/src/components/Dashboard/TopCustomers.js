import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import './TopCustomers.css';

const formatINR = (n) =>
  (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function TopCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        // Prefer dedicated endpoint if your backend has it. Otherwise derive from dashboard.
        const res = await dashboardAPI.getSummary();
        if (!isMounted) return;
        const payload = res.data || res;
        setCustomers(payload?.topCustomers || []);
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to fetch top customers data');
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => { isMounted = false; };
  }, []);

  if (loading) return <div className="top-customers loading">Loading...</div>;
  if (error) return <div className="top-customers error">{error}</div>;

  return (
    <div className="top-customers">
      <h3>Top 5 Customers by Spend</h3>
      <div className="customers-list">
        {customers.length > 0 ? (
          customers.map((customer, index) => (
            <div key={customer.id || customer.email || index} className="customer-item">
              <span className="rank">{index + 1}</span>
              <div className="customer-info">
                <div className="name">
                  {customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email}
                </div>
                <div className="email">{customer.email}</div>
              </div>
              <div className="spend">
                ₹{formatINR(customer.totalSpent)}
              </div>
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
