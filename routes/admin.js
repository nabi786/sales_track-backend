const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomerStatus,
  deleteCustomer
} = require('../controllers/adminController');

// All routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// Customer management routes (only admin can create customers)
router.post('/customers', createCustomer);
router.get('/customers', getAllCustomers);
router.get('/customers/:id', getCustomerById);
router.put('/customers/:id/status', updateCustomerStatus);
router.delete('/customers/:id', deleteCustomer);

module.exports = router;

