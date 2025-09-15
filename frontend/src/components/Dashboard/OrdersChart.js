import React, { useEffect, useMemo, useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Bar,
  Line,
  ComposedChart,
} from 'recharts';
import { dashboardAPI } from '../../services/api';
import { format, subDays } from 'date-fns';
import './OrdersChart.css';

// Helpers
const fmt = (d) => format(new Date(d), 'yyyy-MM-dd');
const formatINR = (n) =>
  (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function fillDates(startDate, endDate, seed = {}) {
  const out = {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = fmt(d);
    out[key] = { date: key, orderCount: 0, revenue: 0, ...(seed[key] || {}) };
  }
  return out;
}

function OrdersChart() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [rawDashboard, setRawDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        // Single source of truth: dashboard endpoint
        const res = await dashboardAPI.getSummary();
        if (!isMounted) return;
        setRawDashboard(res.data || res);
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to fetch orders data');
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => { isMounted = false; };
  }, []);

  const data = useMemo(() => {
    if (!rawDashboard) return [];

    const { dailyRevenue, recentOrders } = rawDashboard;

    if (
      Array.isArray(dailyRevenue) &&
      dailyRevenue.length &&
      dateRange.startDate <= dateRange.endDate
    ) {
      // Use backend series if present
      const base = dailyRevenue.reduce((acc, row) => {
        const key = fmt(row.date || row.day || row.ds || row.Date || row.D);
        acc[key] = {
          date: key,
          orderCount: Number(row.orderCount || row.count || row.orders || 0),
          revenue: Number(row.revenue || row.total || 0),
        };
        return acc;
      }, {});
      const filled = fillDates(dateRange.startDate, dateRange.endDate, base);
      return Object.values(filled);
    }

    // Fallback: derive from recentOrders
    const grouped = (recentOrders || []).reduce((acc, o) => {
      const key = fmt(o.createdAt || o.processedAt || o.date);
      if (!acc[key]) acc[key] = { date: key, orderCount: 0, revenue: 0 };
      acc[key].orderCount += 1;
      acc[key].revenue += Number(o.totalPrice || o.total || 0);
      return acc;
    }, {});
    const filled = fillDates(dateRange.startDate, dateRange.endDate, grouped);
    return Object.values(filled);
  }, [rawDashboard, dateRange]);

  const onDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="orders-chart loading">Loading...</div>;
  if (error) return <div className="orders-chart error">{error}</div>;

  const currencySymbol = '₹';

  return (
    <div className="orders-chart">
      <div className="chart-header">
        <h3>Orders & Revenue Over Time</h3>
        <div className="date-controls">
          <input
            type="date"
            name="startDate"
            value={dateRange.startDate}
            max={dateRange.endDate}
            onChange={onDateChange}
          />
          <span>to</span>
          <input
            type="date"
            name="endDate"
            value={dateRange.endDate}
            min={dateRange.startDate}
            onChange={onDateChange}
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" label={{ value: 'Orders', angle: -90, position: 'insideLeft' }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Revenue (₹)', angle: 90, position: 'insideRight' }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name.toLowerCase().includes('revenue')) {
                return [`${currencySymbol}${formatINR(value)}`, 'Revenue'];
              }
              return [value, 'Orders'];
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="orderCount" name="Orders" />
          <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OrdersChart;
