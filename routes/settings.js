const express = require('express');
const router = express.Router();
const SiteSettings = require('../models/SiteSettings');
const verifyToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/authMiddleware');

// ---- Sanitizer: only these fields can be stored, with length limits ----
const str = (max = 300) => (v) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
// Missing booleans stay undefined (dropped from JSON) so the storefront's default applies
const bool = () => (v) => (v === undefined || v === null ? undefined : v === true || v === 'true');
const url = () => (v) => {
  const s = typeof v === 'string' ? v.trim().slice(0, 1000) : '';
  // Allow absolute http(s) URLs and site-relative paths only
  return /^(https?:\/\/|\/)/i.test(s) ? s : '';
};
const obj = (shape) => (v) => {
  const src = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  return Object.fromEntries(Object.entries(shape).map(([k, fn]) => [k, fn(src[k])]));
};
const list = (itemFn, max) => (v) => (Array.isArray(v) ? v.slice(0, max).map(itemFn) : []);

const sanitizeContent = obj({
  announcement: obj({
    enabled: bool(),
    messages: list(str(140), 5),
  }),
  hero: obj({
    eyebrow: str(80),
    heading: str(120),
    subheading: str(300),
    ctaLabel: str(40),
    ctaLink: url(),
    image: url(),
    imageAlt: str(160),
  }),
  story: obj({
    heading: str(120),
    body: str(2000),
    image: url(),
    imageAlt: str(160),
  }),
  gifting: obj({
    enabled: bool(),
    heading: str(120),
    body: str(600),
    ctaLabel: str(40),
    ctaLink: url(),
    image: url(),
    imageAlt: str(160),
  }),
  collections: list(obj({
    title: str(80),
    description: str(240),
    image: url(),
    link: url(),
  }), 4),
  gallery: list(obj({
    image: url(),
    link: url(),
    alt: str(160),
  }), 8),
  contact: obj({
    email: str(120),
    phone: str(40),
    whatsapp: str(40),
    address: str(300),
    hours: str(160),
  }),
  social: obj({
    instagram: url(),
    facebook: url(),
    tiktok: url(),
  }),
  policies: obj({
    shipping: str(6000),
    returns: str(6000),
  }),
});

// Public: storefront reads this on load
router.get('/', async (req, res) => {
  try {
    const doc = await SiteSettings.findOne({ key: 'site' });
    res.json({ content: doc ? doc.content : {}, updatedAt: doc ? doc.updatedAt : null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// Admin: replace storefront content
router.put('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const content = sanitizeContent(req.body && req.body.content);
    const doc = await SiteSettings.findOneAndUpdate(
      { key: 'site' },
      { content, updatedBy: req.user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ content: doc.content, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;
module.exports.sanitizeContent = sanitizeContent;
