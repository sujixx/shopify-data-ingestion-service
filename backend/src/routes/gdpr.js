const express = require('express');
const router = express.Router();

// Customer data request
router.post('/customer-data-request', async (req, res) => {
  console.log('📩 GDPR: Customer data request received', req.body);
  res.status(200).send('OK');
});

// Customer data erasure
router.post('/customer-data-erasure', async (req, res) => {
  console.log('🗑️ GDPR: Customer data erasure request received', req.body);
  res.status(200).send('OK');
});

// Shop data erasure
router.post('/shop-data-erasure', async (req, res) => {
  console.log('🗑️ GDPR: Shop data erasure request received', req.body);
  res.status(200).send('OK');
});

module.exports = router;
