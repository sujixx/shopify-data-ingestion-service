import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { authAPI, getApiBaseUrl } from '../services/api';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate at app start
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userRaw = localStorage.getItem('user');
      axios.defaults.baseURL = getApiBaseUrl();
      if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (userRaw) setCurrentUser(JSON.parse(userRaw));
    } catch {}
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await authAPI.login(email, password);
      const { token, user } = data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      axios.defaults.baseURL = getApiBaseUrl();
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setCurrentUser(user);
      return { success: true };
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Login failed (network/CORS/env?)';
      console.error('Login error:', err);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  const value = useMemo(
    () => ({
      currentUser,
      login,
      logout,
      loading,
      isAuthenticated: !!localStorage.getItem('token'),
    }),
    [currentUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
