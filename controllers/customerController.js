const Customer = require('../models/Customer');
const Shop = require('../models/Shop');
const Product = require('../models/Product');

// Get customer profile
const getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select('-password');
    const shop = await Shop.findOne({ customer_id: req.user._id });
    res.json({
      ...customer.toObject(),
      shop
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update customer profile
const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    const updateData = {};

    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    
    // Check if phone is being updated and if it's already taken
    if (phone) {
      const existingPhone = await Customer.findOne({ 
        phone, 
        _id: { $ne: req.user._id } 
      });
      if (existingPhone) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
      updateData.phone = phone;
    }

    const customer = await Customer.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      customer
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create shop (with optional logo upload)
const createShop = async (req, res) => {
  try {
    const { shop_name, shop_email, phone, address } = req.body;

    if (!shop_name || !shop_email || !phone || !address) {
      return res.status(400).json({ message: 'Please provide shop_name, shop_email, phone, and address' });
    }

    // Enforce one shop per customer
    const existingShop = await Shop.findOne({ customer_id: req.user._id });
    if (existingShop) {
      return res.status(400).json({ message: 'Customer already has a shop' });
    }

    // Check if shop_email already exists
    const existingEmail = await Shop.findOne({ shop_email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Shop with this email already exists' });
    }

    // Check if phone already exists
    const existingPhone = await Shop.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: 'Shop with this phone number already exists' });
    }

    // Handle logo upload if file exists
    let logoUrl = '';
    if (req.file) {
      logoUrl = `/uploads/shop-logos/${req.file.filename}`;
    }

    const shop = new Shop({
      shop_name,
      logo: logoUrl,
      shop_email,
      phone,
      address,
      customer_id: req.user._id
    });

    await shop.save();
    await shop.populate('customer_id', 'first_name last_name email');

    res.status(201).json({
      message: 'Shop created successfully',
      shop
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all shops for the logged-in customer
const getMyShops = async (req, res) => {
  try {
    const shops = await Shop.find({ customer_id: req.user._id })
      .populate('customer_id', 'first_name last_name email');
    
    // Get product counts for each shop (only non-deleted products)
    const shopsWithCounts = await Promise.all(
      shops.map(async (shop) => {
        const productCount = await Product.countDocuments({ shop_id: shop._id, is_deleted: false });
        return {
          ...shop.toObject(),
          product_count: productCount
        };
      })
    );
    
    res.json(shopsWithCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get shop by ID
const getShopById = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      _id: req.params.id,
      customer_id: req.user._id
    }).populate('customer_id', 'first_name last_name email');

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Get products for this shop (only non-deleted products)
    const products = await Product.find({ shop_id: shop._id, is_deleted: false });
    const shopData = shop.toObject();
    shopData.products = products;
    shopData.product_count = products.length;

    res.json(shopData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update shop (with optional logo upload)
const updateShop = async (req, res) => {
  try {
    const { shop_name, shop_email, phone, address } = req.body;
    const updateData = {};

    if (shop_name) updateData.shop_name = shop_name;
    if (address) updateData.address = address;

    // Check if shop_email is being updated and if it's already taken
    if (shop_email) {
      const existingEmail = await Shop.findOne({ 
        shop_email, 
        _id: { $ne: req.params.id } 
      });
      if (existingEmail) {
        return res.status(400).json({ message: 'Shop email already exists' });
      }
      updateData.shop_email = shop_email;
    }

    // Check if phone is being updated and if it's already taken
    if (phone) {
      const existingPhone = await Shop.findOne({ 
        phone, 
        _id: { $ne: req.params.id } 
      });
      if (existingPhone) {
        return res.status(400).json({ message: 'Shop phone number already exists' });
      }
      updateData.phone = phone;
    }

    // Handle logo upload if file exists
    if (req.file) {
      updateData.logo = `/uploads/shop-logos/${req.file.filename}`;
    }

    const shop = await Shop.findOneAndUpdate(
      { _id: req.params.id, customer_id: req.user._id },
      updateData,
      { new: true }
    );

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    res.json({
      message: 'Shop updated successfully',
      shop
    });
  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `Shop ${field === 'shop_email' ? 'email' : 'phone'} already exists` 
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// Delete shop
const deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findOneAndDelete({
      _id: req.params.id,
      customer_id: req.user._id
    });

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Delete all products associated with this shop
    await Product.deleteMany({ shop_id: req.params.id });

    res.json({ message: 'Shop and associated products deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  createShop,
  getMyShops,
  getShopById,
  updateShop,
  deleteShop
};
