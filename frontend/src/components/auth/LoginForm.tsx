import React, { useState } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Typography, 
  message, 
  Tabs, 
  Space,
  Divider,
  Spin
} from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  MailOutlined, 
  ShopOutlined,
  RobotOutlined 
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import './LoginForm.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface LoginFormProps {
  onLoginSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      await apiService.login(values.email, values.password);
      message.success('🎉 Welcome to Xeno FDE Analytics!');
      onLoginSuccess();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: any) => {
    setLoading(true);
    try {
      await apiService.register(values);
      message.success('🚀 Account created successfully!');
      onLoginSuccess();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async () => {
    setLoading(true);
    try {
      await apiService.login('admin@xeno.com', 'password123');
      message.success('🎯 Demo account loaded!');
      onLoginSuccess();
    } catch (error: any) {
      message.error('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="floating-shapes">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="floating-shape"
              animate={{
                y: [0, -20, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                left: `${10 + i * 15}%`,
                top: `${20 + i * 10}%`,
              }}
            />
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="login-card-container"
      >
        <Card className="login-card glassmorphism">
          <div className="login-header">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <RobotOutlined className="login-icon" />
            </motion.div>
            <Title level={2} className="login-title">
              Xeno FDE Analytics
            </Title>
            <Text className="login-subtitle">
              AI-Powered Multi-Tenant Shopify Insights
            </Text>
          </div>

          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            centered
            className="login-tabs"
          >
            <TabPane tab="Sign In" key="login">
              <Form
                name="login"
                onFinish={handleLogin}
                layout="vertical"
                size="large"
                className="login-form"
              >
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="Enter your email"
                    className="modern-input"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[{ required: true, message: 'Password is required' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Enter your password"
                    className="modern-input"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                    className="login-button"
                  >
                    {loading ? <Spin size="small" /> : 'Sign In to Dashboard'}
                  </Button>
                </Form.Item>
              </Form>

              <Divider>or</Divider>

              <Button
                type="dashed"
                onClick={loginDemo}
                loading={loading}
                block
                size="large"
                className="demo-button"
                icon={<RobotOutlined />}
              >
                Try Demo Account
              </Button>

              <div className="demo-credentials">
                <Text type="secondary">
                  Demo: admin@xeno.com / password123
                </Text>
              </div>
            </TabPane>

            <TabPane tab="Create Account" key="register">
              <Form
                name="register"
                onFinish={handleRegister}
                layout="vertical"
                size="large"
                className="login-form"
              >
                <Space.Compact style={{ display: 'flex' }}>
                  <Form.Item
                    name="firstName"
                    style={{ flex: 1, marginRight: 8 }}
                    rules={[{ required: true, message: 'First name required' }]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="First Name"
                      className="modern-input"
                    />
                  </Form.Item>
                  <Form.Item
                    name="lastName"
                    style={{ flex: 1 }}
                    rules={[{ required: true, message: 'Last name required' }]}
                  >
                    <Input
                      placeholder="Last Name"
                      className="modern-input"
                    />
                  </Form.Item>
                </Space.Compact>

                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="Business Email"
                    className="modern-input"
                  />
                </Form.Item>

                <Form.Item
                  name="companyName"
                  rules={[{ required: true, message: 'Company name is required' }]}
                >
                  <Input
                    prefix={<ShopOutlined />}
                    placeholder="Company / Store Name"
                    className="modern-input"
                  />
                </Form.Item>

                <Form.Item
                  name="shopifyDomain"
                >
                  <Input
                    placeholder="your-store.myshopify.com (optional)"
                    className="modern-input"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: 'Password is required' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Create Password (min 6 chars)"
                    className="modern-input"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                    className="login-button"
                  >
                    Create Account & Setup Analytics
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>

          <div className="login-footer">
            <Text type="secondary">
              Built for Xeno Forward Deployed Engineer Assignment 2025
            </Text>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginForm;
