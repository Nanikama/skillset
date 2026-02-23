const express   = require('express');
const router    = express.Router();
const crypto    = require('crypto');
const Razorpay  = require('razorpay');
const Payment   = require('../models/Payment');
const User      = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendEnrollmentEmail } = require('../utils/email');

const { PACKAGES } = require('../config/packages');

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const isPlaceholder = !keyId || !keySecret ||
    /your_razorpay|YOUR_KEY|xxxx|change_this/i.test(keyId + keySecret);
  if (isPlaceholder) {
    throw new Error('Razorpay keys not configured in environment variables');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

const isDev = process.env.NODE_ENV !== 'production';

/* Helper: add enrollment to user */
async function enrollUser(userId, pkg, paymentId) {
  const user = await User.findById(userId);
  const alreadyEnrolled = user.enrolledPackages.some(ep => Number(ep.packageId) === pkg.id);
  if (!alreadyEnrolled) {
    user.enrolledPackages.push({
      packageId  : pkg.id,
      packageName: pkg.name,
      amount     : pkg.price,
      enrolledAt : new Date(),
    });
    await user.save();
  }
  await Payment.findByIdAndUpdate(paymentId, { status: 'paid' });
  sendEnrollmentEmail({
    to         : user.email,
    name       : user.name,
    packageName: pkg.name,
    amount     : pkg.price,
  });
  return user;
}

/* ── POST /api/payments/create-order ── */
router.post('/create-order', protect, async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = PACKAGES.find(p => p.id === Number(packageId));
    if (!pkg) return res.status(400).json({ error: 'Invalid package.' });

    /* Check if already enrolled */
    const user = await User.findById(req.user._id);
    if (user.enrolledPackages.some(ep => Number(ep.packageId) === pkg.id)) {
      return res.status(409).json({ error: 'Already enrolled in this package.' });
    }

    /* Dev mode: skip Razorpay when keys not configured */
    let useMock = false;
    if (isDev) {
      try { getRazorpay(); } catch { useMock = true; }
    }
    if (isDev && useMock) {
      const payment = await Payment.create({
        userId     : req.user._id,
        packageId  : pkg.id,
        packageName: pkg.name,
        amount     : pkg.price,
        isDev      : true,
      });
      return res.json({
        mock      : true,
        paymentId : payment._id,
        packageName: pkg.name,
        amount    : pkg.price,
      });
    }

    /* Production: create Razorpay order */
    const order = await getRazorpay().orders.create({
      amount  : pkg.price,
      currency: 'INR',
      receipt : `sb_${pkg.id}_${Date.now()}`,
      notes   : { userId: req.user._id.toString(), packageId: pkg.id },
    });

    const payment = await Payment.create({
      userId          : req.user._id,
      packageId       : pkg.id,
      packageName     : pkg.name,
      amount          : pkg.price,
      razorpayOrderId : order.id,
    });

    res.json({
      mock       : false,
      orderId    : order.id,
      paymentId  : payment._id,
      packageName: pkg.name,
      amount     : pkg.price,
      currency   : 'INR',
      keyId      : process.env.RAZORPAY_KEY_ID,
      prefill    : {
        name : req.user.name,
        email: req.user.email,
        contact: req.user.phone,
      },
    });
  } catch (err) {
    console.error('[create-order]', err);
    res.status(500).json({ error: 'Could not create payment order.' });
  }
});

/* ── POST /api/payments/verify ── */
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;

    /* Verify signature */
    const body      = razorpay_order_id + '|' + razorpay_payment_id;
    const expected  = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                            .update(body).digest('hex');
    if (expected !== razorpay_signature) {
      await Payment.findByIdAndUpdate(paymentId, {
        status            : 'failed',
        razorpayPaymentId : razorpay_payment_id,
      });
      return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment record not found.' });

    const pkg = PACKAGES.find(p => p.id === Number(payment.packageId));
    await Payment.findByIdAndUpdate(paymentId, {
      razorpayOrderId  : razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    const user = await enrollUser(req.user._id, pkg, paymentId);
    res.json({ success: true, message: 'Payment verified & enrollment complete.', user: user.toJSON() });
  } catch (err) {
    console.error('[verify]', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

/* ── POST /api/payments/dev-confirm ── (only works in dev) */
router.post('/dev-confirm', protect, async (req, res) => {
  if (!isDev) return res.status(403).json({ error: 'Not available in production.' });
  try {
    const { paymentId } = req.body;
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    const pkg  = PACKAGES.find(p => p.id === Number(payment.packageId));
    const user = await enrollUser(req.user._id, pkg, paymentId);
    res.json({ success: true, message: 'Dev payment confirmed.', user: user.toJSON() });
  } catch (err) {
    console.error('[dev-confirm]', err);
    res.status(500).json({ error: 'Dev confirmation failed.' });
  }
});

/* ── GET /api/payments/my-payments ── */
router.get('/my-payments', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ payments });
  } catch {
    res.status(500).json({ error: 'Could not fetch payments.' });
  }
});

module.exports = router;
