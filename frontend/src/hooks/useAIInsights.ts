import { useState, useEffect } from 'react';
import { AIInsights, BusinessRecommendation } from '../types';
import apiService from '../services/api';

export const useAIInsights = () => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<BusinessRecommendation[]>([]);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        // Simulate AI insights since we don't have real ML backend yet
        const mockInsights: AIInsights = {
          customerSegments: [
            { name: 'Champions', count: 25, percentage: 20, averageValue: 450, color: '#52c41a' },
            { name: 'Loyal Customers', count: 40, percentage: 32, averageValue: 320, color: '#1890ff' },
            { name: 'Potential Loyalists', count: 30, percentage: 24, averageValue: 180, color: '#722ed1' },
            { name: 'At Risk', count: 20, percentage: 16, averageValue: 150, color: '#fa8c16' },
            { name: 'Cannot Lose Them', count: 10, percentage: 8, averageValue: 600, color: '#f5222d' }
          ],
          churnRiskAlert: {
            highRiskCount: 15,
            mediumRiskCount: 25,
            lowRiskCount: 85,
            criticalCustomers: []
          },
          revenueForecasting: {
            nextMonth: 45000,
            nextQuarter: 135000,
            confidence: 0.87,
            trend: 'up'
          },
          recommendations: [
            {
              type: 'customer_retention',
              title: 'Launch VIP Program for Champions',
              description: 'Create exclusive benefits for your top 20% customers',
              impact: 'high',
              effort: 'medium',
              estimatedRevenue: 15000
            },
            {
              type: 'upselling',
              title: 'Cross-sell to Loyal Customers',
              description: 'Recommend complementary products to frequent buyers',
              impact: 'high',
              effort: 'low',
              estimatedRevenue: 12000
            },
            {
              type: 'marketing',
              title: 'Win-back Campaign for At-Risk Customers',
              description: 'Send personalized offers to prevent churn',
              impact: 'medium',
              effort: 'medium',
              estimatedRevenue: 8000
            }
          ]
        };
        
        setInsights(mockInsights);
        setRecommendations(mockInsights.recommendations);
      } catch (error) {
        console.error('Failed to fetch AI insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  return {
    insights,
    recommendations,
    loading,
  };
};
