import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { dashboardAPI } from '../../services/api';
import { format, subDays, parseISO, eachDayOfInterval } from 'date-fns';
import './OrdersChart.css';

const asYMD = (d) => format(new Date(d), 'yyyy-MM-dd');
const toDate = (ymd) => new Date(`${ymd}T00:00:00`);

export default function OrdersChart() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [raw, setRaw] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await dashboardAPI.getSummary();
        if (mounted) setRaw(res.data || res); // support {success,data} or plain
      } catch (e) {
        console.error(e);
        if (mounted) setError('Failed to fetch dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []); // fetch once; we filter client-side by date range

  const series = useMemo(() => {
    if (!raw) return [];

    // Preferred: backend-provided dailyRevenue
    const backendDaily = Array.isArray(raw.dailyRevenue) ? raw.dailyRevenue : [];

    // Fallback: bucket recent orders by day
    const fallbackDaily = (() => {
      const orders = Array.isArray(raw.recentOrders) ? raw.recentOrders : [];
      const map = new Map();
      for (const o of orders) {
        const when = o.processedAt || o.createdAt || o.updatedAt;
        if (!when) continue;
        const day = asYMD(when);
        const prev = map.get(day) || { revenue: 0, orderCount: 0 };
        map.set(day, {
          revenue: prev.revenue + (Number(o.totalPrice) || 0),
          orderCount: prev.orderCount + 1,
        });
      }
      return Array.from(map.entries()).map(([date, v]) => ({
        date,
        revenue: v.revenue,
        orderCount: v.orderCount,
      }));
    })();

    // Normalize to {date: ymd, revenue, orderCount}
    const normalizedBackend = backendDaily.map((d) => ({
      date: asYMD(d.date || d.day || d.timestamp || new Date()),
      revenue: Number(d.revenue) || 0,
      orderCount: Number(d.orderCount) || 0,
    }));

    // Prefer backend if it has at least one non-zero day; else fallback
    const source =
      normalizedBackend.some((d) => d.revenue > 0 || d.orderCount > 0)
        ? normalizedBackend
        : fallbackDaily;

    // Fill gaps across selected date range
    const start = toDate(dateRange.startDate);
    const end = toDate(dateRange.endDate);
    const byDay = new Map(source.map((d) => [d.date, d]));

    const allDays = eachDayOfInterval({ start, end }).map((d) => asYMD(d));
    return allDays.map((day) => ({
      date: day,
      revenue: byDay.get(day)?.revenue || 0,
      orderCount: byDay.get(day)?.orderCount || 0,
    }));
  }, [raw, dateRange]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="orders-chart loading">Loading…</div>;
  if (error) return <div className="orders-chart error">{error}</div>;

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
            onChange={handleDateChange}
          />
          <span>to</span>
          <input
            type="date"
            name="endDate"
            value={dateRange.endDate}
            min={dateRange.startDate}
            onChange={handleDateChange}
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={series}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'MM/dd')} />
          <YAxis />
          <Tooltip
            formatter={(val, key) =>
              key === 'revenue'
                ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(val || 0)
                : val
            }
            labelFormatter={(d) => format(parseISO(d), 'MMM dd, yyyy')}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue (USD)"
            stroke="#4a90e2"
            fill="#e6f2ff"
            strokeWidth={2}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="orderCount"
            name="Orders"
            stroke="#7d4ae2"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
