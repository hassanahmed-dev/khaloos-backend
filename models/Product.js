const mongoose = require('mongoose');

function generateFourDigitId() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

const ColorStockSchema = new mongoose.Schema({
  color: { type: String, required: true },
  stock: { type: Number, required: true }
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
    default: generateFourDigitId
  },
  productName: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  discountedPrice: { type: Number },
  shortDescription: { type: String },
  description: { type: String },
  stock: { type: Number, default: 0 },
  images: [{ type: String }],
  imageUrl: { type: String },
  colors: [
    {
      color: { type: String, required: true },
      stock: { type: Number, required: true }
    }
  ],
  colorStock: [ColorStockSchema],
  // Optional shoe sizes offered for every colour (e.g. ["36", "37", "38"]); empty for bags
  sizes: [{ type: String }],
  status: { type: String, enum: ['In Stock', 'Out Of Stock'], default: 'In Stock' },
  featured: { type: Boolean, default: false },
  ratings: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Product', ProductSchema); 