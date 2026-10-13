const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, WebP, AVIF or GIF images are allowed'));
  },
});
const streamifier = require('streamifier');
const verifyToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/authMiddleware');
const Order = require('../models/Order');

// Multipart forms send arrays as JSON strings; an empty string means "no items"
function parseJsonArray(value) {
  if (typeof value !== 'string') return value;
  if (value.trim() === '') return [];
  return JSON.parse(value);
}

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get top-rated products for dashboard (dynamic by ratings)
router.get('/top-rated', async (req, res) => {
  try {
    const products = await Product.find({}, {
      productName: 1,
      ratings: 1,
      status: 1,
      price: 1,
      imageUrl: 1
    })
      .sort({ ratings: -1 })
      .limit(10);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Public best sellers: products ranked by quantity sold in non-cancelled orders
router.get('/best-sellers', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 24);
    const ranked = await Order.aggregate([
      { $match: { orderStatus: { $nin: ['cancelled', 'failed'] } } },
      { $unwind: '$cartItems' },
      { $group: { _id: '$cartItems.productId', orderCount: { $sum: '$cartItems.quantity' } } },
      { $sort: { orderCount: -1 } },
      { $limit: limit },
    ]);
    const products = await Product.find({ _id: { $in: ranked.map(r => r._id) } });
    const byId = new Map(products.map(p => [p._id.toString(), p]));
    res.json(
      ranked
        .filter(r => byId.has(String(r._id)))
        .map(r => ({ ...byId.get(String(r._id)).toObject(), orderCount: r.orderCount }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new product with image
router.post('/', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    console.log('Received product add request');
    // Parse array fields if they are sent as JSON strings
    if (typeof req.body.colors === 'string') {
        req.body.colors = parseJsonArray(req.body.colors);
    }
    if (typeof req.body.sizes === 'string') {
        req.body.sizes = parseJsonArray(req.body.sizes);
    }
    req.body.images = parseJsonArray(req.body.images);

    // Generate sequential 4-digit id
    const lastProduct = await Product.findOne().sort({ id: -1 }).limit(1);
    let newId = lastProduct && !isNaN(Number(lastProduct.id)) ? (Number(lastProduct.id) + 1).toString() : "1000";
    if (newId.length < 4) newId = newId.padStart(4, "0");

    let imageUrl = '';
    if (req.file) {
      console.log('Uploading image to Cloudinary...');
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
      const uploadResponse = await cloudinary.uploader.upload(dataURI, { folder: 'products' });
      imageUrl = uploadResponse.secure_url;
      console.log('Image uploaded:', imageUrl);
    }

    const stock = Number(req.body.stock) || 0;
    const status = stock > 0 ? 'In Stock' : 'Out Of Stock';

    const productData = {
      ...req.body,
      status,
      id: newId,
      imageUrl: imageUrl || req.body.imageUrl || ''
    };

    // Remove colorStock if present (fixes Cast to embedded failed error)
    if (productData.colorStock) {
      delete productData.colorStock;
    }

    console.log('Saving product:', productData);
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('Error in product add route:', err);
    res.status(500).json({ message: 'Image upload failed', error: err.message });
  }
});

// PUT update product with image
router.put('/:id', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    // Parse JSON fields if needed
    if (typeof req.body.colors === 'string') {
      req.body.colors = parseJsonArray(req.body.colors);
    }
    if (typeof req.body.sizes === 'string') {
      req.body.sizes = parseJsonArray(req.body.sizes);
    }
    req.body.images = parseJsonArray(req.body.images);
    // Parse colorStock if sent as a string (defensive fix)
    if (typeof req.body.colorStock === 'string') {
      try {
        req.body.colorStock = JSON.parse(req.body.colorStock);
      } catch (e) {
        req.body.colorStock = undefined;
      }
    }
    
    // Upload new image if exists
    let imageUrl;
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        folder: 'products',
      });
      imageUrl = uploadResponse.secure_url;
      console.log('req.file:', req.file);
      console.log('imageUrl:', imageUrl);
    }

    const stock = Number(req.body.stock) || 0;
    const status = stock > 0 ? 'In Stock' : 'Out Of Stock';
    
    // Update product with new image URL if uploaded
    const updateData = {
      ...req.body,
      status,
      ...(imageUrl && { imageUrl })
    };

    // Remove colorStock if present (fixes Cast to embedded failed error on edit)
    if (updateData.colorStock) {
      delete updateData.colorStock;
    }

    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );
    
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE product
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ id: req.params.id });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 