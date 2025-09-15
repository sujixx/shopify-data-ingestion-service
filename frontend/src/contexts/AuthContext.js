import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate auth from localStorage exactly once
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userRaw = localStorage.getItem('user');
      if (token) {
        axios.defaults.baseURL = process.env.REACT_APP_API_URL;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      if (userRaw) {
        setCurrentUser(JSON.parse(userRaw));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        email,
        password,
      });
      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.baseURL = process.env.REACT_APP_API_URL;
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setCurrentUser(user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Login failed',
      };
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
      isAuthenticated: !!currentUser && !!localStorage.getItem('token'),
    }),
    [currentUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
