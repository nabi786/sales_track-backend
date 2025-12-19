const express = require('express');
const router = express.Router();
const { authenticate, isCustomer } = require('../middleware/auth');
const { uploadShopLogo, handleMulterError } = require('../middleware/upload');
const {
  getProfile,
  updateProfile,
  createShop,
  getMyShops,
  getShopById,
  updateShop,
  deleteShop
} = require('../controllers/customerController');

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

module.exports = router;
