const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const verifyToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/authMiddleware');

const MAX_BYTES = 8 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, WebP, AVIF or GIF images are allowed'));
  },
});

const FOLDERS = new Set(['products', 'storefront']);

// Admin: upload a single image to Cloudinary and return its URL.
// Used for product gallery images and storefront content (hero, story, collections).
router.post('/image', verifyToken, requireAdmin, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 8 MB or smaller' : err.message;
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    try {
      const folder = FOLDERS.has(req.body.folder) ? req.body.folder : 'storefront';
      const dataURI = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const result = await cloudinary.uploader.upload(dataURI, { folder });
      res.status(201).json({ url: result.secure_url, width: result.width, height: result.height });
    } catch (uploadErr) {
      console.error('Image upload error:', uploadErr);
      res.status(500).json({ error: 'Image upload failed' });
    }
  });
});

module.exports = router;
