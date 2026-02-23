const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name       : { type: String, required: true },
  tag        : { type: String, required: true },
  description: { type: String },
  thumbnail  : { url: { type: String }, alt: { type: String } },
  isActive   : { type: Boolean, default: true },
  order      : { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
