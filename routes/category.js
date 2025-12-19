const express = require('express');
const router = express.Router();
const { authenticate, isCustomer } = require('../middleware/auth');
const {
  createCategory,
  getAllCategories,
  getAllCategoriesSimple,
  getCategoryById,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

// All routes require authentication and customer role
router.use(authenticate);
router.use(isCustomer);

// Category routes
router.post('/', createCategory);
router.get('/', getAllCategories);
router.get('/simple', getAllCategoriesSimple);
router.get('/:id', getCategoryById);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;

