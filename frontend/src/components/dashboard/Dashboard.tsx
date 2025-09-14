import React, { useState } from 'react';
import { Layout, Tabs, Badge, Button, notification, Typography } from 'antd';
import { LogoutOutlined, LineChartOutlined, UserOutlined, RiseOutlined, ThunderboltOutlined } from '@ant-design/icons';
import KPIHeader from './KPIHeader';
import TrendsTab from './TrendsTab';
import CustomersTab from './CustomersTab';
import OrdersTab from './OrdersTab';
import AIInsightsTab from './AIInsightsTab';
import apiService from '../../services/api';
import './Dashboard.css';

const { Title } = Typography;
const { Header, Content } = Layout;
const { TabPane } = Tabs;

const Dashboard: React.FC = () => {
  const handleLogout = () => {
    apiService.logout();
    window.location.href = "/login";
  };

  return (
    <Layout className="dashboard-layout">
      <Header className="dashboard-header">
        <div className="dashboard-title">
          <LineChartOutlined style={{ fontSize: 30, color: '#1890ff', marginRight: 12 }} />
          <Title level={3} style={{ color: 'white', marginBottom: 0 }}>
            Xeno FDE Analytics Dashboard
          </Title>
        </div>
        <div>
          <Badge status="processing" color="#764ba2" text="Multi-tenant Demo" />
          <Button
            icon={<LogoutOutlined />}
            style={{ marginLeft: 24 }}
            shape="round"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </Header>
      <Content className="dashboard-content">
        <KPIHeader />
        <Tabs
          defaultActiveKey="trends"
          size="large"
          type="card"
          style={{ marginTop: 32 }}
        >
          <TabPane
            tab={<span><RiseOutlined /> Trends & Metrics</span>}
            key="trends"
          >
            <TrendsTab />
          </TabPane>
          <TabPane
            tab={<span><UserOutlined /> Customers</span>}
            key="customers"
          >
            <CustomersTab />
          </TabPane>
          <TabPane
            tab={<span><ThunderboltOutlined /> Orders</span>}
            key="orders"
          >
            <OrdersTab />
          </TabPane>
          <TabPane
            tab={<span><LineChartOutlined /> AI Insights</span>}
            key="ai"
          >
            <AIInsightsTab />
          </TabPane>
        </Tabs>
      </Content>
    </Layout>
  );
};

export default Dashboard;
