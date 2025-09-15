import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard';
import './App.css';

function FullScreenLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#666' }}>
      Loading…
    </div>
    );
}

function ProtectedRoute({ element }) {
  const auth = useAuth();
  // If context is not ready yet, show loader (prevents redirect loops/glitches)
  if (!auth || auth.loading) return <FullScreenLoader />;
  return auth.isAuthenticated ? element : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
