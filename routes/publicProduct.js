const express = require('express');
const router = express.Router();
const { getProducts } = require('../controllers/productController');

// Public product routes (no authentication required)
router.get('/', getProducts);

module.exports = router;

