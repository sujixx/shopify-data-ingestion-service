import React, { useState } from 'react';
import { Card, DatePicker, Row, Col, Statistic, Typography } from 'antd';
import { AreaChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';
import moment from 'moment';
import { useRealTimeData } from '../../hooks/useRealTimeData';
import useAdvancedAnalytics from '../../hooks/useAdvancedAnalytics';

const { RangePicker } = DatePicker;
const { Title } = Typography;

const TrendsTab: React.FC = () => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    moment().subtract(30, "days").format("YYYY-MM-DD"),
    moment().format("YYYY-MM-DD"),
  ]);

  const { data, loading } = useRealTimeData(30000);
  const advanced = useAdvancedAnalytics(dateRange);

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={16}>
        <Card title="Revenue Trend (Last 30 days)">
          <RangePicker
            style={{ marginBottom: 24 }}
            value={[moment(dateRange[0]), moment(dateRange[1])]}
            onChange={dates => {
              if (dates) {
                setDateRange([dates[0].format("YYYY-MM-DD"), dates[1].format("YYYY-MM-DD")]);
              }
            }}
          />
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date: string) => moment(date).format("MM/DD")}
              />
              <YAxis />
              <Tooltip labelFormatter={d => moment(d).format("MMM DD, YYYY")} formatter={(v: number, name: string) => name === "revenue" ? `$${v}` : v} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#764ba2" fill="#faf6fb" name="Revenue ($)" />
              <Line type="monotone" dataKey="orderCount" stroke="#1890ff" name="Orders" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card title="Customer Segments">
          <BarChart
            width={280}
            height={200}
            data={[
              { segment: "Champions", customers: advanced.segments.Champions || 0 },
              { segment: "Loyal", customers: advanced.segments["Loyal Customers"] || 0 },
              { segment: "Potential", customers: advanced.segments["Potential Loyalists"] || 0 },
              { segment: "At Risk", customers: advanced.segments["At Risk"] || 0 },
              { segment: "New", customers: advanced.segments["New Customers"] || 0 }
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="segment" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="customers" fill="#1890ff" />
          </BarChart>
        </Card>
      </Col>
    </Row>
  );
};

export default TrendsTab;
