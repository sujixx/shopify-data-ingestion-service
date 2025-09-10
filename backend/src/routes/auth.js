const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('companyName').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, firstName, lastName, companyName } = req.body;

    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'User exists' });

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async tx => {
      const tenant = await tx.tenant.create({ data: { name: companyName } });
      const user = await tx.user.create({ data: { email, password: hashedPassword, firstName, lastName, role: 'ADMIN', tenantId: tenant.id } });
      return { tenant, user };
    });

    const token = jwt.sign({ userId: result.user.id, email: result.user.email, tenantId: result.tenant.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res.status(201).json({ success: true, token, user: result.user, tenant: result.tenant });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await prisma.user.findFirst({ where: { email, isActive: true }, include: { tenant: true } });
    if (!user || !user.tenant.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, email: user.email, tenantId: user.tenant.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    res.json({ success: true, token, user, tenant: user.tenant });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;

