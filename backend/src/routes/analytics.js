const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard analytics
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { tenantId } = req;
    const { startDate, endDate } = req.query;

    // Set default date range (last 30 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get metrics in parallel
    const [
      totalCustomers,
      totalOrders,
      totalRevenue,
      recentOrders,
      topCustomers,
      dailyRevenue
    ] = await Promise.all([
      // Total customers
      prisma.customer.count({
        where: { tenantId }
      }),

      // Total orders in range
      prisma.order.count({
        where: {
          tenantId,
          createdAt: { gte: start, lte: end }
        }
      }),

      // Total revenue
      prisma.order.aggregate({
        where: {
          tenantId,
          createdAt: { gte: start, lte: end }
        },
        _sum: { totalPrice: true }
      }),

      // Recent orders
      prisma.order.findMany({
        where: { tenantId },
        include: {
          customer: {
            select: { email: true, firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Top customers
      prisma.customer.findMany({
        where: { tenantId },
        orderBy: { totalSpent: 'desc' },
        take: 5
      }),

      // Daily revenue (using raw query for MySQL)
      prisma.$queryRaw`
        SELECT 
          DATE(createdAt) as date,
          SUM(totalPrice) as revenue,
          COUNT(*) as orderCount
        FROM orders 
        WHERE tenantId = ${tenantId} 
          AND createdAt >= ${start} 
          AND createdAt <= ${end}
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `
    ]);

    // Calculate metrics
    const avgOrderValue = totalOrders > 0 ? (totalRevenue._sum.totalPrice || 0) / totalOrders : 0;

    // Today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [todayOrders, todayRevenue] = await Promise.all([
      prisma.order.count({
        where: { tenantId, createdAt: { gte: today } }
      }),
      prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: today } },
        _sum: { totalPrice: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          totalOrders,
          totalRevenue: totalRevenue._sum.totalPrice || 0,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100
        },
        today: {
          orders: todayOrders,
          revenue: todayRevenue._sum.totalPrice || 0
        },
        recentOrders,
        topCustomers,
        dailyRevenue: dailyRevenue.map(day => ({
          date: day.date,
          revenue: parseFloat(day.revenue || 0),
          orderCount: parseInt(day.orderCount || 0)
        }))
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data'
    });
  }
});

// Get customers with filtering
router.get('/customers', authenticate, async (req, res) => {
  try {
    const { tenantId } = req;
    const { page = 1, limit = 20, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { tenantId };
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } }
      ];
    }

    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({
      error: 'Failed to fetch customers'
    });
  }
});

// Get orders with filtering
router.get('/orders', authenticate, async (req, res) => {
  try {
    const { tenantId } = req;
    const { page = 1, limit = 20, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { tenantId };
    if (status) {
      where.status = status;
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { email: true, firstName: true, lastName: true }
          },
          orderItems: {
            select: { title: true, quantity: true, price: true }
          }
        }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders'
    });
  }
});

module.exports = router;
