const express = require('express');
const router = express.Router();

// test endpoint
router.get('/', (req, res) => {
  res.json({ message: 'Shopify route is working!' });
});

module.exports = router;
