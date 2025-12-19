const Customer = require('../models/Customer');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const Category = require('../models/Category');
const path = require('path');

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
    
    // Get product counts for each shop
    const shopsWithCounts = await Promise.all(
      shops.map(async (shop) => {
        const productCount = await Product.countDocuments({ shop_id: shop._id });
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

    // Get products for this shop
    const products = await Product.find({ shop_id: shop._id });
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

// Create product (with multiple image uploads) - automatically uses logged-in user's shop
const createProduct = async (req, res) => {
  try {
    const { name, sale_price, buy_price, quantity, category_id } = req.body;

    if (!name || !sale_price || !buy_price || quantity === undefined) {
      return res.status(400).json({ 
        message: 'Please provide name, sale_price, buy_price, and quantity' 
      });
    }

    // Automatically get the shop for the logged-in user
    const shop = await Shop.findOne({
      customer_id: req.user._id
    });

    if (!shop) {
      return res.status(404).json({ message: 'No shop found for this user. Please create a shop first.' });
    }

    // If category_id is provided, verify it belongs to the customer (not checking shop_id)
    if (category_id) {
      const category = await Category.findOne({
        _id: category_id,
        customer_id: req.user._id,
        is_deleted: false
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found or does not belong to this user' });
      }
    }

    const product = new Product({
      name,
      sale_price,
      buy_price,
      quantity,
      shop_id: shop._id,
      customer_id: req.user._id,
      category_id: category_id || undefined
    });

    await product.save();

    // Handle product images upload (up to 4 images)
    let firstImageUrl = null;
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map((file, index) => {
        return ProductImage.create({
          product_id: product._id,
          image_url: `/uploads/product-images/${file.filename}`,
          image_order: index
        });
      });
      await Promise.all(imagePromises);
      
      // Get first image URL
      const firstImage = await ProductImage.findOne({ product_id: product._id })
        .sort({ image_order: 1 });
      if (firstImage) {
        firstImageUrl = firstImage.image_url;
      }
    }

    // Return only required fields
    const productData = {
      id: product._id,
      name: product.name,
      sale_price: product.sale_price,
      buy_price: product.buy_price,
      quantity: product.quantity,
      image: firstImageUrl
    };

    res.status(201).json({
      message: 'Product created successfully',
      product: productData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all products for the logged-in customer with pagination
const getMyProducts = async (req, res) => {
  try {
    const { shop_id, page = 1, limit = 10, search } = req.query;
    const query = { customer_id: req.user._id };
    
    if (shop_id) {
      query.shop_id = shop_id;
    }

    // Optional: search by product name (case-insensitive)
    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' }; // Case-insensitive search
    }

    // Parse pagination parameters
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Get total count for pagination metadata
    const totalProducts = await Product.countDocuments(query);

    // Get paginated products - select only needed fields
    const products = await Product.find(query)
      .select('name sale_price buy_price quantity')
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limitNumber);
    
    // Get first image for each product
    const productsWithFirstImage = await Promise.all(
      products.map(async (product) => {
        const firstImage = await ProductImage.findOne({ product_id: product._id })
          .sort({ image_order: 1 });
        
        return {
          id: product._id,
          name: product.name,
          sale_price: product.sale_price,
          buy_price: product.buy_price,
          quantity: product.quantity,
          image: firstImage ? firstImage.image_url : null
        };
      })
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalProducts / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;
    
    res.json({
      products: productsWithFirstImage,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalProducts,
        limit: limitNumber,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      customer_id: req.user._id
    })
      .populate('shop_id', 'shop_name')
      .populate('category_id', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get product images
    const images = await ProductImage.find({ product_id: product._id })
      .sort({ image_order: 1 });
    
    const productData = product.toObject();
    productData.images = images;

    res.json(productData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { name, sale_price, buy_price, quantity, category_id } = req.body;
    
    // Check if product exists and belongs to the customer
    const existingProduct = await Product.findOne({
      _id: req.params.id,
      customer_id: req.user._id
    });

    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updateData = {};

    // Validate and update name
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Product name cannot be empty' });
      }
      updateData.name = name.trim();
    }

    // Validate and update sale_price
    if (sale_price !== undefined) {
      if (typeof sale_price !== 'number' || sale_price < 0) {
        return res.status(400).json({ message: 'Sale price must be a non-negative number' });
      }
      updateData.sale_price = sale_price;
    }

    // Validate and update buy_price
    if (buy_price !== undefined) {
      if (typeof buy_price !== 'number' || buy_price < 0) {
        return res.status(400).json({ message: 'Buy price must be a non-negative number' });
      }
      updateData.buy_price = buy_price;
    }

    // Validate and update quantity
    if (quantity !== undefined) {
      if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ message: 'Quantity must be a non-negative number' });
      }
      updateData.quantity = quantity;
    }

    // Handle category_id update
    let unsetFields = {};
    if (category_id !== undefined) {
      if (category_id === null || category_id === '') {
        // Remove category
        unsetFields.category_id = 1;
      } else {
        // Verify category belongs to customer and product's shop
        const category = await Category.findOne({
          _id: category_id,
          customer_id: req.user._id,
          shop_id: existingProduct.shop_id,
          is_deleted: false
        });

        if (!category) {
          return res.status(404).json({ message: 'Category not found or does not belong to this shop' });
        }

        updateData.category_id = category_id;
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0 && Object.keys(unsetFields).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Build update query with $unset if needed
    const updateQuery = { ...updateData };
    if (Object.keys(unsetFields).length > 0) {
      updateQuery.$unset = unsetFields;
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, customer_id: req.user._id },
      updateQuery,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get first image for the product (matching GET products format)
    const firstImage = await ProductImage.findOne({ product_id: product._id })
      .sort({ image_order: 1 });

    // Return in the same format as GET products endpoint
    const productData = {
      id: product._id,
      name: product.name,
      sale_price: product.sale_price,
      buy_price: product.buy_price,
      quantity: product.quantity,
      image: firstImage ? firstImage.image_url : null
    };

    res.json({
      message: 'Product updated successfully',
      product: productData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      customer_id: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete all product images
    await ProductImage.deleteMany({ product_id: req.params.id });

    res.json({ message: 'Product and associated images deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add images to existing product
const addProductImages = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      customer_id: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check current image count
    const currentImageCount = await ProductImage.countDocuments({ product_id: product._id });
    const newImagesCount = req.files ? req.files.length : 0;
    
    if (currentImageCount + newImagesCount > 4) {
      return res.status(400).json({ 
        message: `Maximum 4 images allowed. Currently have ${currentImageCount}, trying to add ${newImagesCount}` 
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images provided' });
    }

    // Add new images
    const imagePromises = req.files.map((file, index) => {
      return ProductImage.create({
        product_id: product._id,
        image_url: `/uploads/product-images/${file.filename}`,
        image_order: currentImageCount + index
      });
    });
    
    await Promise.all(imagePromises);

    // Get all product images
    const images = await ProductImage.find({ product_id: product._id })
      .sort({ image_order: 1 });

    res.json({
      message: 'Images added successfully',
      images
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete product image
const deleteProductImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    
    const image = await ProductImage.findById(imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Verify product belongs to customer
    const product = await Product.findOne({
      _id: image.product_id,
      customer_id: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    await ProductImage.findByIdAndDelete(imageId);

    res.json({ message: 'Image deleted successfully' });
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
  deleteShop,
  createProduct,
  getMyProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addProductImages,
  deleteProductImage
};

