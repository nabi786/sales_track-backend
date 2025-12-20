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
  deleteShop,
  getMyShop,
  updateMyShop
} = require('../controllers/customerController');

// All routes require authentication and customer role
router.use(authenticate);
router.use(isCustomer);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Shop routes (singular - for logged-in user's shop)
router.get('/shop', getMyShop);
router.put('/shop', (req, res, next) => {
  uploadShopLogo(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, updateMyShop);

// Shop routes (plural - for multiple shops management)
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
