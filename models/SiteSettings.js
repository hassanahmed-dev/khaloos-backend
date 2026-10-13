const mongoose = require('mongoose');

// Single document (key: 'site') holding storefront content the owner edits from the admin
// panel: announcement bar, homepage hero, brand story, contact channels, policies, etc.
// The shape is enforced by the sanitizer in routes/settings.js.
const siteSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'site' },
  content: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, minimize: false });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
