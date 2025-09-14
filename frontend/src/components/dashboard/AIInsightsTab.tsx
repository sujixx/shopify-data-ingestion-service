import React from 'react';
import { Card, Row, Col, Statistic, Alert, List, Tag, Typography } from 'antd';
import { useAIInsights } from '../../hooks/useAIInsights';

const { Title } = Typography;

const AIInsightsTab: React.FC = () => {
  const { insights, recommendations, loading } = useAIInsights();

  return (
    <Card title="AI-Powered Insights">
      {loading ? <div style={{ textAlign: 'center' }}>Loading insights...</div> : (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={8}>
            <Statistic
              title="Revenue Forecast (Next Month)"
              value={insights?.revenueForecasting?.nextMonth ?? 0}
              prefix="$"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
            <Statistic
              title="Forecast Confidence"
              value={Math.round((insights?.revenueForecasting?.confidence ?? 0) * 100)}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
              style={{ marginTop: 32 }}
            />
          </Col>
          <Col xs={24} lg={8}>
            <Alert
              message="Churn Risk Alert"
              description={`High risk customers: ${insights?.churnRiskAlert?.highRiskCount ?? 0}`}
              type="warning"
              showIcon
            />
            <Statistic
              title="Critical Customers"
              value={insights?.churnRiskAlert?.criticalCustomers?.length ?? 0}
              valueStyle={{ color: '#f5222d' }}
              style={{ marginTop: 32 }}
            />
          </Col>
          <Col xs={24} lg={8}>
            <Title level={5}>Business Recommendations</Title>
            <List
              dataSource={recommendations}
              renderItem={rec => (
                <List.Item>
                  <Tag color={
                    rec.impact === 'high' ? 'green' :
                    rec.impact === 'medium' ? 'orange' : 'blue'
                  }>
                    {rec.type.replace("_", " ").toUpperCase()}
                  </Tag>
                  <span><strong>{rec.title}</strong>: {rec.description}</span>
                  {rec.estimatedRevenue && (
                    <Tag color="purple" style={{ marginLeft: 8 }}>
                      +${rec.estimatedRevenue}
                    </Tag>
                  )}
                </List.Item>
              )}
            />
          </Col>
        </Row>
      )}
    </Card>
  );
};

export default AIInsightsTab;
