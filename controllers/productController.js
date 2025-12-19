const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const Category = require('../models/Category');
const Shop = require('../models/Shop');

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

    // Populate category if it exists
    if (product.category_id) {
      await product.populate('category_id', 'name _id');
    }

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

    // Return in the same format as GET products endpoint
    const productData = {
      id: product._id,
      name: product.name,
      sale_price: product.sale_price,
      buy_price: product.buy_price,
      quantity: product.quantity,
      image: firstImageUrl,
      category: product.category_id ? {
        id: product.category_id._id,
        name: product.category_id.name
      } : null
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
    const query = { customer_id: req.user._id, is_deleted: false };
    
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
      .select('name sale_price buy_price quantity category_id')
      .populate('category_id', 'name _id')
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
          image: firstImage ? firstImage.image_url : null,
          category: product.category_id ? {
            id: product.category_id._id,
            name: product.category_id.name
          } : null
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
      customer_id: req.user._id,
      is_deleted: false
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
    // Parse JSON fields from body (if sent as JSON string in multipart form)
    let name, sale_price, buy_price, quantity, category_id;
    
    if (req.body.name !== undefined) name = req.body.name;
    if (req.body.sale_price !== undefined) sale_price = typeof req.body.sale_price === 'string' ? parseFloat(req.body.sale_price) : req.body.sale_price;
    if (req.body.buy_price !== undefined) buy_price = typeof req.body.buy_price === 'string' ? parseFloat(req.body.buy_price) : req.body.buy_price;
    if (req.body.quantity !== undefined) quantity = typeof req.body.quantity === 'string' ? parseInt(req.body.quantity, 10) : req.body.quantity;
    if (req.body.category_id !== undefined) category_id = req.body.category_id === '' ? null : req.body.category_id;
    
    // Check if product exists and belongs to the customer (and is not deleted)
    const existingProduct = await Product.findOne({
      _id: req.params.id,
      customer_id: req.user._id,
      is_deleted: false
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
      if (isNaN(sale_price) || sale_price < 0) {
        return res.status(400).json({ message: 'Sale price must be a non-negative number' });
      }
      updateData.sale_price = sale_price;
    }

    // Validate and update buy_price
    if (buy_price !== undefined) {
      if (isNaN(buy_price) || buy_price < 0) {
        return res.status(400).json({ message: 'Buy price must be a non-negative number' });
      }
      updateData.buy_price = buy_price;
    }

    // Validate and update quantity
    if (quantity !== undefined) {
      if (isNaN(quantity) || quantity < 0) {
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

    // Handle image uploads if files are provided
    if (req.files && req.files.length > 0) {
      // Validate new images count (maximum 4 images allowed)
      const newImagesCount = req.files.length;
      
      if (newImagesCount > 4) {
        return res.status(400).json({ 
          message: `Maximum 4 images allowed. Trying to upload ${newImagesCount} images` 
        });
      }

      // Delete all existing images for this product
      await ProductImage.deleteMany({ product_id: existingProduct._id });

      // Add new images
      const imagePromises = req.files.map((file, index) => {
        return ProductImage.create({
          product_id: existingProduct._id,
          image_url: `/uploads/product-images/${file.filename}`,
          image_order: index
        });
      });
      
      await Promise.all(imagePromises);
    }

    // Check if there's anything to update (product fields or images)
    if (Object.keys(updateData).length === 0 && Object.keys(unsetFields).length === 0 && (!req.files || req.files.length === 0)) {
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
    )
    .populate('category_id', 'name _id');

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
      image: firstImage ? firstImage.image_url : null,
      category: product.category_id ? {
        id: product.category_id._id,
        name: product.category_id.name
      } : null
    };

    res.json({
      message: 'Product updated successfully',
      product: productData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete product (soft delete - sets is_deleted to true)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        customer_id: req.user._id,
        is_deleted: false
      },
      { is_deleted: true },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add images to existing product
const addProductImages = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      customer_id: req.user._id,
      is_deleted: false
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

    // Verify product belongs to customer and is not deleted
    const product = await Product.findOne({
      _id: image.product_id,
      customer_id: req.user._id,
      is_deleted: false
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
  createProduct,
  getMyProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addProductImages,
  deleteProductImage
};

