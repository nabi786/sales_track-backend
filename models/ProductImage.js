const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  image_url: {
    type: String,
    required: true
  },
  image_order: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes for faster queries
productImageSchema.index({ product_id: 1, image_order: 1 });

module.exports = mongoose.model('ProductImage', productImageSchema);










