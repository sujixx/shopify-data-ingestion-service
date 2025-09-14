import React, { useEffect, useState } from 'react';
import { ConfigProvider, Spin } from 'antd';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './components/dashboard/Dashboard';
import apiService from './services/api';

function App() {
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    setAuthenticated(apiService.isAuthenticated());
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: '#764ba2', colorInfo: '#1890ff' },
      }}
    >
      <Router>
        <Routes>
          <Route
            path="/login"
            element={<LoginForm onLoginSuccess={() => setAuthenticated(true)} />}
          />
          <Route
            path="/dashboard"
            element={authenticated ? <Dashboard /> : <Navigate to="/login" />}
          />
          {/* Redirect any route to dashboard if authenticated, else to login */}
          <Route
            path="*"
            element={<Navigate to={authenticated ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
