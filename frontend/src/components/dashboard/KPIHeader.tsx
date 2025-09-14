import React from 'react';
import { Card, Col, Row, Statistic, Typography, Tooltip } from 'antd';
import { DollarOutlined, ShoppingOutlined, UserOutlined, RocketOutlined, LineChartOutlined } from '@ant-design/icons';
import { useRealTimeData } from '../../hooks/useRealTimeData';
import moment from 'moment';
import './KPIHeader.css';

const { Text } = Typography;

const KPIHeader: React.FC = () => {
  const { data, loading, lastUpdated, refresh } = useRealTimeData(20000);

  return (
    <Card className="kpi-card" bordered={false} loading={loading}>
      <Row gutter={[16, 16]} justify="space-between">
        <Col xs={24} sm={6}>
          <Statistic
            title="Total Revenue"
            value={data?.overview?.totalRevenue || 0}
            prefix={<DollarOutlined />}
            precision={2}
            valueStyle={{ color: "#429f72", fontWeight: 700 }}
            suffix="USD"
          />
          <Text type="secondary">Today: ${data?.today?.revenue?.toFixed(2) || "0.00"}</Text>
        </Col>
        <Col xs={24} sm={6}>
          <Statistic
            title="Total Orders"
            value={data?.overview?.totalOrders || 0}
            prefix={<ShoppingOutlined />}
            valueStyle={{ color: "#1890ff", fontWeight: 700 }}
          />
          <Text type="secondary">
            Today: {data?.today?.orders ?? 0}
          </Text>
        </Col>
        <Col xs={24} sm={6}>
          <Statistic
            title="Total Customers"
            value={data?.overview?.totalCustomers || 0}
            prefix={<UserOutlined />}
            valueStyle={{ color: "#764ba2", fontWeight: 700 }}
          />
        </Col>
        <Col xs={24} sm={6}>
          <Statistic
            title="Avg. Order Value"
            value={data?.overview?.avgOrderValue || 0}
            prefix={<RocketOutlined />}
            precision={2}
            valueStyle={{ color: "#fa8c16", fontWeight: 700 }}
            suffix="USD"
          />
        </Col>
      </Row>
      <Row align="middle" justify="space-between" style={{ marginTop: 12 }}>
        <Col>
          <Tooltip title="Last updated">
            <Text type="secondary">
              <LineChartOutlined />{" "}
              {lastUpdated ? moment(lastUpdated).format('HH:mm:ss') : "Loading..."}
            </Text>
          </Tooltip>
        </Col>
        <Col>
          <Text
            type="secondary"
            style={{ cursor: "pointer", fontWeight: 600 }}
            onClick={refresh}
          >🔄 Refresh</Text>
        </Col>
      </Row>
    </Card>
  );
};

export default KPIHeader;
