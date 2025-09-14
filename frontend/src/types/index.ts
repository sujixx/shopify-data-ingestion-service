// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Tenant {
  id: string;
  name: string;
  shopifyDomain?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  tenant: Tenant;
}

// Business Data Types
export interface Customer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  totalSpent: number;
  ordersCount: number;
  lastOrderDate?: string;
  createdAt: string;
  // AI-powered fields
  lifetimeValue?: number;
  churnRisk?: number;
  segment?: string;
  predictedNextPurchase?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  email?: string;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  customer?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  orderItems?: OrderItem[];
}

export interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  totalPrice: number;
  sku?: string;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  vendor?: string;
  status: string;
}

// Analytics Types
export interface DashboardMetrics {
  overview: {
    totalCustomers: number;
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
  };
  today: {
    orders: number;
    revenue: number;
  };
  recentOrders: Order[];
  topCustomers: Customer[];
  dailyRevenue: DailyRevenue[];
  // AI Insights
  aiInsights?: AIInsights;
  predictions?: PredictiveMetrics;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orderCount: number;
}

// AI-Powered Insights
export interface AIInsights {
  customerSegments: CustomerSegment[];
  churnRiskAlert: ChurnAlert;
  revenueForecasting: RevenueForecast;
  recommendations: BusinessRecommendation[];
}

export interface CustomerSegment {
  name: string;
  count: number;
  percentage: number;
  averageValue: number;
  color: string;
}

export interface ChurnAlert {
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  criticalCustomers: Customer[];
}

export interface RevenueForecast {
  nextMonth: number;
  nextQuarter: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export interface BusinessRecommendation {
  type: 'customer_retention' | 'upselling' | 'inventory' | 'marketing';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  estimatedRevenue?: number;
}

export interface PredictiveMetrics {
  predictedRevenue: number;
  churnRiskTrend: number;
  customerGrowthRate: number;
  seasonalTrends: SeasonalTrend[];
}

export interface SeasonalTrend {
  month: string;
  predictedRevenue: number;
  confidence: number;
}

// Enums
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}
