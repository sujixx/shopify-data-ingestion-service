import React, { useEffect, useMemo, useState } from 'react';
import { dashboardAPI } from '../../services/api';
import './AIInsightsPanel.css';

const toISODate = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  const z = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
  return z.toISOString().slice(0,10);
};
const sum = (arr) => (arr || []).reduce((a, b) => a + (Number(b) || 0), 0);
const pct = (a,b) => !b ? (a?100:0) : ((a-b)/b)*100;

export default function AIInsightsPanel() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let off=false;
    (async ()=>{
      try {
        const res = await dashboardAPI.getSummary();
        setSummary(res.data || res);
      } finally {
        if (!off) setLoading(false);
      }
    })();
    return ()=>{ off=true; };
  },[]);

  const { revSeries, ordSeries } = useMemo(()=>{
    const orders = (summary?.ordersByDate || []).map(p=>({date:p.date, value:Number(p.count||p.value||0)}));

    const revByDate = new Map();
    (summary?.recentOrders || []).forEach(o=>{
      const date = toISODate(o.date || o.processedAt || o.createdAt || o.created_at);
      const amt = Number(o?.totalPrice ?? o?.total_price ?? 0) || 0;
      if (!date) return;
      revByDate.set(date, (revByDate.get(date)||0) + amt);
    });

    const dates = Array.from(new Set([...orders.map(p=>p.date), ...revByDate.keys()]))
      .filter(Boolean).sort();

    const rev = dates.map(d=>({date:d, value:Number(revByDate.get(d)||0)}));
    const ord = dates.map(d=>({date:d, value:Number((orders.find(p=>p.date===d)?.value)||0)}));
    return { revSeries: rev, ordSeries: ord };
  },[summary]);

  const insights = useMemo(()=>{
    const last = (s,n)=> s.slice(-n).map(p=>p.value);
    const rev7 = sum(last(revSeries,7));
    const revPrev7 = sum(last(revSeries,14).slice(0,7));
    const ord7 = sum(last(ordSeries,7));
    const ordPrev7 = sum(last(ordSeries,14).slice(0,7));
    const aov7 = ord7 ? rev7/ord7 : 0;
    const aovPrev7 = ordPrev7 ? revPrev7/ordPrev7 : 0;

    // naive forecast = last 7 days revenue
    const forecast7 = rev7;

    // anomaly: yesterday vs 14d mean ± 2σ
    const l14 = last(revSeries,14);
    const mean = l14.length ? sum(l14)/l14.length : 0;
    const variance = l14.length ? sum(l14.map(v=>(v-mean)**2))/l14.length : 0;
    const sigma = Math.sqrt(variance);
    const yday = last(revSeries,1)[0] || 0;
    const anomaly =
      sigma>0 && (yday > mean+2*sigma || yday < mean-2*sigma)
        ? (yday>mean ? 'Revenue spike detected' : 'Revenue dip detected')
        : 'Normal range';

    const bestDay = revSeries.reduce((b,p)=> p.value>(b?.value??-1)?p:b, null);

    // segments (approximate) from topCustomers or derive from orders
    const segments = (() => {
      const tc = summary?.topCustomers || [];
      const seg = { Champions:0, 'Loyal Customers':0, 'Potential Loyalists':0, 'At Risk':0, 'New Customers':0 };
      tc.forEach(c=>{
        const spent = Number(c.totalSpent||0);
        const orders = Number(c.ordersCount||0);
        if (orders>5 && spent>500) seg.Champions++;
        else if (orders>3 && spent>300) seg['Loyal Customers']++;
        else if (orders>1 && spent>100) seg['Potential Loyalists']++;
        else if (orders<=1 && spent<50) seg['New Customers']++;
        else seg['At Risk']++;
      });
      return seg;
    })();

    const recs = [
      { title:'VIP perks for Champions', impact:'high', why:`${segments.Champions||0} high-value buyers` },
      { title:'Cross-sell to Loyal Customers', impact:'high', why:'Lift AOV via bundles' },
      { title:'Win-back At-Risk', impact:'medium', why:'Re-engage lapsed buyers' },
    ];

    return {
      kpis: {
        revenue7: { value: rev7, change: pct(rev7, revPrev7) },
        orders7:  { value: ord7, change: pct(ord7, ordPrev7) },
        aov7:     { value: aov7, change: pct(aov7, aovPrev7) },
      },
      forecast7, anomaly, bestDay, segments, recs
    };
  },[revSeries, ordSeries, summary]);

  if (loading) return null;

  return (
    <div className="ai-panel">
      <div className="ai-row">
        <Kpi title="7-Day Revenue" value={`$${Math.round(insights.kpis.revenue7.value).toLocaleString()}`} change={insights.kpis.revenue7.change}/>
        <Kpi title="7-Day Orders"  value={insights.kpis.orders7.value} change={insights.kpis.orders7.change}/>
        <Kpi title="7-Day AOV"     value={`$${insights.kpis.aov7.value.toFixed(2)}`} change={insights.kpis.aov7.change}/>
      </div>

      <div className="ai-row">
        <Card title="Forecast (next 7d)" body={
          <div className="big">${Math.round(insights.forecast7).toLocaleString()}</div>
        } hint="Baseline equals last 7 days" />
        <Card title="Signal" body={
          <span className={`badge ${/spike/.test(insights.anomaly)?'up':/dip/.test(insights.anomaly)?'down':''}`}>
            {insights.anomaly}
          </span>
        } hint="14d mean ± 2σ" />
        <Card title="Best Day (last 30d)" body={
          <div className="big">{insights.bestDay?.date || '—'} · ${Math.round(insights.bestDay?.value||0).toLocaleString()}</div>
        } />
      </div>

      <div className="ai-row">
        <Card title="Quick Recommendations" body={
          <ul className="recs">
            {insights.recs.map((r,i)=>(
              <li key={i}><strong>{r.title}</strong> <em className={`tag ${r.impact}`}>{r.impact}</em>
              <span className="why"> – {r.why}</span></li>
            ))}
          </ul>
        } />
      </div>
    </div>
  );
}

function Kpi({title,value,change}) {
  const up = change>0, down=change<0;
  return (
    <div className="ai-kpi">
      <div className="k-title">{title}</div>
      <div className="k-value">{value}</div>
      <div className={`k-change ${up?'up':down?'down':''}`}>
        {Number.isFinite(change) ? `${up?'+':''}${change.toFixed(1)}%` : '—'}
      </div>
    </div>
  );
}

function Card({title, body, hint}) {
  return (
    <div className="ai-card">
      <div className="c-title">{title}</div>
      <div className="c-body">{body}</div>
      {hint ? <div className="c-hint">{hint}</div> : null}
    </div>
  );
}
