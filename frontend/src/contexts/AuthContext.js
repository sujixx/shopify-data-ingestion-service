import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Same-origin axios; Vercel proxy handles /api/*
    const base = process.env.REACT_APP_API_URL || "";
    axios.defaults.baseURL = base;

    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      try { setCurrentUser(JSON.parse(user)); } catch {}
    }
    setReady(true);
  }, []);

  const login = async (email, password) => {
    try {
      const base = process.env.REACT_APP_API_URL || ""; // same-origin default
      const { data } = await axios.post(`${base}/api/auth/login`, { email, password });
      const { token, user } = data || {};
      if (token && user) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        axios.defaults.baseURL = base;
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        setCurrentUser(user);
        return { success: true };
      }
      return { success: false, error: "Invalid login response" };
    } catch (e) {
      return { success: false, error: e?.response?.data?.message || "Login failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common.Authorization;
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: !!currentUser, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}
