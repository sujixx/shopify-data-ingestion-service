// This file can be used for additional authentication-related functions
// Currently, all auth functions are in the AuthContext

export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};