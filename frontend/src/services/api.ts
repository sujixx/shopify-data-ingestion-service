import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { 
  AuthResponse, 
  DashboardMetrics, 
  Customer, 
  Order, 
  ApiResponse,
  PaginatedResponse,
  AIInsights 
} from '../types';

class APIService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    
    if (response.data.success) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('tenant', JSON.stringify(response.data.tenant));
    }
    
    return response.data;
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName: string;
    shopifyDomain?: string;
  }): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', userData);
    
    if (response.data.success) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('tenant', JSON.stringify(response.data.tenant));
    }
    
    return response.data;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getCurrentTenant() {
    const tenant = localStorage.getItem('tenant');
    return tenant ? JSON.parse(tenant) : null;
  }

  // Analytics methods
  async getDashboardMetrics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<DashboardMetrics> {
    const response = await this.api.get<ApiResponse<DashboardMetrics>>(
      '/analytics/dashboard',
      { params }
    );
    return response.data.data!;
  }

  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Customer>> {
    const response = await this.api.get<PaginatedResponse<Customer>>(
      '/analytics/customers',
      { params }
    );
    return response.data;
  }

  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Order>> {
    const response = await this.api.get<PaginatedResponse<Order>>(
      '/analytics/orders',
      { params }
    );
    return response.data;
  }

  // AI-powered methods
  async getAIInsights(): Promise<AIInsights> {
    const response = await this.api.get<ApiResponse<AIInsights>>('/analytics/ai-insights');
    return response.data.data!;
  }

  async getCustomerInsights(customerId: string) {
    const response = await this.api.get(`/analytics/customers/${customerId}/insights`);
    return response.data.data;
  }

  async predictCustomerBehavior(customerId: string) {
    const response = await this.api.post(`/analytics/customers/${customerId}/predict`);
    return response.data.data;
  }

  // Shopify integration methods
  async syncShopifyData(resources: string[] = ['customers', 'orders', 'products']) {
    const response = await this.api.post('/shopify/sync', { resources });
    return response.data;
  }

  async connectShopifyStore(shopifyDomain: string, accessToken?: string) {
    const response = await this.api.post('/shopify/connect', {
      shopifyDomain,
      accessToken
    });
    return response.data;
  }

  // Export methods
  async exportData(type: 'customers' | 'orders' | 'analytics', format: 'csv' | 'excel' = 'csv') {
    const response = await this.api.get(`/analytics/export/${type}`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }
}

export const apiService = new APIService();
export default apiService;
