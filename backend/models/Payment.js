const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId     : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  packageId  : { type: Number, required: true },
  packageName: { type: String, required: true },
  amount     : { type: Number, required: true }, // in paise
  currency   : { type: String, default: 'INR' },
  status     : { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  razorpayOrderId  : { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  isDev : { type: Boolean, default: false }, // true for dev/mock payments
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
