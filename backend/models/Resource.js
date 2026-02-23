const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title     : { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category  : { type: String, required: true, default: 'General' },
  visibility: { type: String, enum: ['public', 'enrolled'], default: 'public' },
  fileUrl   : { type: String }, // URL or path
  fileName  : { type: String },
  fileSize  : { type: Number, default: 0 },
  fileType  : { type: String }, // pdf, doc, img, etc.
  downloads : { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive  : { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);
