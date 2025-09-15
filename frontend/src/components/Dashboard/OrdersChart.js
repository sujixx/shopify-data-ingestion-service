import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardAPI } from '../../services/api';
import { format, parseISO, isWithinInterval } from 'date-fns';
import './OrdersChart.css';

function OrdersChart() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [range, setRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await dashboardAPI.getSummary();
        const data = res?.data?.data ?? res?.data ?? {};
        setPayload(data);
      } catch (e) {
        setErr('Failed to fetch orders data');
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const chartData = useMemo(() => {
    if (!payload) return [];

    // Prefer backend-provided dailyRevenue; else compute from recentOrders
    let rows = Array.isArray(payload.dailyRevenue) ? payload.dailyRevenue.map(r => ({
      date: r.date,
      count: r.orderCount ?? r.count ?? 0,
    })) : [];

    if (!rows.length && Array.isArray(payload.recentOrders)) {
      const map = new Map();
      for (const o of payload.recentOrders) {
        const key = (o.createdAt || o.created_at || '').slice(0, 10);
        if (!key) continue;
        map.set(key, (map.get(key) || 0) + 1);
      }
      rows = Array.from(map.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
    }

    // Filter by chosen date range
    const start = parseISO(range.startDate);
    const end = parseISO(range.endDate);
    return rows.filter(r => {
      const d = parseISO(r.date);
      return isWithinInterval(d, { start, end });
    });
  }, [payload, range]);

  if (loading) return <div className="orders-chart loading">Loading…</div>;
  if (err) return <div className="orders-chart error">{err}</div>;

  const onDateChange = (e) => {
    const { name, value } = e.target;
    setRange(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="orders-chart">
      <div className="chart-header">
        <h3>Orders Over Time</h3>
        <div className="date-controls">
          <input type="date" name="startDate" value={range.startDate} onChange={onDateChange} />
          <span>to</span>
          <input type="date" name="endDate" value={range.endDate} onChange={onDateChange} />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OrdersChart;
