import { useState, useEffect, useMemo } from 'react';
import { Customer, Order, DailyRevenue } from '../types';
import apiService from '../services/api';

export const useAdvancedAnalytics = (dateRange: [string, string]) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, ordersRes] = await Promise.all([
          apiService.getCustomers({ limit: 1000 }),
          apiService.getOrders({ 
            limit: 1000,
            startDate: dateRange[0],
            endDate: dateRange[1]
          })
        ]);
        
        setCustomers(customersRes.data.items);
        setOrders(ordersRes.data.items);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Advanced calculations
  const analytics = useMemo(() => {
    // Customer Lifetime Value calculations
    const customerLTV = customers.map(customer => ({
      ...customer,
      ltv: customer.totalSpent * 2.5, // Simple LTV formula
      churnRisk: Math.random() * 0.4 + (customer.ordersCount < 2 ? 0.3 : 0), // Mock churn risk
    }));

    // Revenue cohort analysis
    const cohortAnalysis = calculateCohortAnalysis(orders);

    // Growth metrics
    const growthMetrics = calculateGrowthMetrics(orders);

    // Customer segments
    const segments = segmentCustomers(customerLTV);

    return {
      customerLTV,
      cohortAnalysis,
      growthMetrics,
      segments,
      totalLTV: customerLTV.reduce((sum, c) => sum + c.ltv, 0),
      avgChurnRisk: customerLTV.reduce((sum, c) => sum + c.churnRisk, 0) / customerLTV.length,
    };
  }, [customers, orders]);

  return {
    ...analytics,
    loading,
    refresh: () => setLoading(true)
  };
};

// Helper functions
function calculateCohortAnalysis(orders: Order[]) {
  // Simplified cohort analysis
  const cohorts = orders.reduce((acc, order) => {
    const month = new Date(order.createdAt).toISOString().slice(0, 7);
    if (!acc[month]) {
      acc[month] = { customers: new Set(), revenue: 0, orders: 0 };
    }
    acc[month].revenue += order.totalPrice;
    acc[month].orders += 1;
    if (order.customer?.email) {
      acc[month].customers.add(order.customer.email);
    }
    return acc;
  }, {} as any);

  return Object.entries(cohorts).map(([month, data]: [string, any]) => ({
    month,
    customers: data.customers.size,
    revenue: data.revenue,
    orders: data.orders,
  }));
}

function calculateGrowthMetrics(orders: Order[]) {
  const thisMonth = orders.filter(o => 
    new Date(o.createdAt).getMonth() === new Date().getMonth()
  );
  const lastMonth = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    return orderDate.getMonth() === lastMonthDate.getMonth();
  });

  const revenueGrowth = thisMonth.length > 0 && lastMonth.length > 0
    ? ((thisMonth.reduce((sum, o) => sum + o.totalPrice, 0) - 
        lastMonth.reduce((sum, o) => sum + o.totalPrice, 0)) / 
       lastMonth.reduce((sum, o) => sum + o.totalPrice, 0)) * 100
    : 0;

  return {
    revenueGrowth,
    orderGrowth: ((thisMonth.length - lastMonth.length) / (lastMonth.length || 1)) * 100,
  };
}

function segmentCustomers(customers: any[]) {
  return customers.reduce((acc, customer) => {
    let segment = 'New Customers';
    if (customer.ordersCount > 5 && customer.totalSpent > 500) {
      segment = 'Champions';
    } else if (customer.ordersCount > 3 && customer.totalSpent > 300) {
      segment = 'Loyal Customers';
    } else if (customer.ordersCount > 1 && customer.totalSpent > 100) {
      segment = 'Potential Loyalists';
    } else if (customer.churnRisk > 0.6) {
      segment = 'At Risk';
    }

    acc[segment] = (acc[segment] || 0) + 1;
    return acc;
  }, {} as any);
}
