const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sale_price: {
    type: Number,
    required: true,
    min: 0
  },
  buy_price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  shop_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false
  },
  is_deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
productSchema.index({ shop_id: 1 });
productSchema.index({ customer_id: 1 });
productSchema.index({ shop_id: 1, customer_id: 1 });
productSchema.index({ category_id: 1 });
productSchema.index({ is_deleted: 1 });
productSchema.index({ customer_id: 1, is_deleted: 1 });

module.exports = mongoose.model('Product', productSchema);

