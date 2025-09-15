import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardAPI } from '../../services/api';
import { format, subDays } from 'date-fns';
import './OrdersChart.css';

function OrdersChart() {
  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchOrdersData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardAPI.getOrdersByDate(
        dateRange.startDate,
        dateRange.endDate
      );
      setOrdersData(res.data || []);
    } catch (err) {
      console.error(err);
      setOrdersData([]);
      setError('Failed to fetch orders data');
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    fetchOrdersData();
  }, [fetchOrdersData]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="orders-chart loading">Loading...</div>;
  if (error) return <div className="orders-chart error">{error}</div>;

  return (
    <div className="orders-chart">
      <div className="chart-header">
        <h3>Orders Over Time</h3>
        <div className="date-controls">
          <input
            type="date"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleDateChange}
          />
          <span>to</span>
          <input
            type="date"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleDateChange}
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={ordersData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="count" activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OrdersChart;
