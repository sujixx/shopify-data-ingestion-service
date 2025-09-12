const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Express JWT authentication middleware.
 * Usage: router.get('/protected', authenticate, handler)
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user, include their tenant for validation
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { tenant: true }
    });

    if (!user || !user.isActive || !user.tenant || !user.tenant.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user/tenant' });
    }

    // Attach user/context to request
    req.user = user;
    req.tenantId = user.tenantId;
    req.tenant = user.tenant;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * JWT token generator for use in your /login & /register.
 */
const generateToken = (user) => jwt.sign(
  {
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
);

module.exports = { authenticate, generateToken };
