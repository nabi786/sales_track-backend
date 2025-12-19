const express = require('express');
const router = express.Router();
const { authenticate, isCustomer } = require('../middleware/auth');
const { uploadShopLogo, uploadProductImages, handleMulterError } = require('../middleware/upload');
const {
  getProfile,
  updateProfile,
  createShop,
  getMyShops,
  getShopById,
  updateShop,
  deleteShop,
  createProduct,
  getMyProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addProductImages,
  deleteProductImage
} = require('../controllers/customerController');
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

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Shop routes - multer must be before any body parsing
router.post('/shops', (req, res, next) => {
  uploadShopLogo(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, createShop);
router.get('/shops', getMyShops);
router.get('/shops/:id', getShopById);
router.put('/shops/:id', (req, res, next) => {
  uploadShopLogo(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, updateShop);
router.delete('/shops/:id', deleteShop);

// Product routes
router.post('/products', (req, res, next) => {
  uploadProductImages(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, createProduct);
router.get('/products', getMyProducts);
router.get('/products/:id', getProductById);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Product image routes
router.post('/products/:id/images', (req, res, next) => {
  uploadProductImages(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, addProductImages);
router.delete('/products/images/:imageId', deleteProductImage);

// Category routes
router.post('/categories', createCategory);
router.get('/categories', getAllCategories);
router.get('/categories/simple', getAllCategoriesSimple);
router.get('/categories/:id', getCategoryById);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

module.exports = router;

