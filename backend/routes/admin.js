const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const Payment  = require('../models/Payment');
const Resource = require('../models/Resource');
const { protect, adminOnly } = require('../middleware/auth');

/* All admin routes require auth + admin role */
router.use(protect, adminOnly);

/* ── GET /api/admin/stats ── */
router.get('/stats', async (_req, res) => {
  try {
    const [totalUsers, totalFiles, totalPayments, enrolledCount] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Resource.countDocuments({ isActive: true }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      User.countDocuments({ 'enrolledPackages.0': { $exists: true } }),
    ]);

    const totalRevenue = totalPayments[0]?.total || 0;
    const totalDownloads = await Resource.aggregate([{ $group: { _id: null, total: { $sum: '$downloads' } } }]);

    res.json({
      totalUsers,
      totalFiles,
      enrolledCount,
      totalRevenue    : totalRevenue / 100,
      totalDownloads  : totalDownloads[0]?.total || 0,
      totalTransactions: totalPayments[0]?.count || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch stats.' });
  }
});

/* ── GET /api/admin/users ── */
router.get('/users', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = { role: 'user' };
    if (search) {
      filter.$or = [
        { name  : { $regex: search, $options: 'i' } },
        { email : { $regex: search, $options: 'i' } },
        { phone : { $regex: search, $options: 'i' } },
      ];
    }
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      User.countDocuments(filter),
    ]);
    res.json({ users: users.map(u => u.toJSON()), total, page: Number(page) });
  } catch {
    res.status(500).json({ error: 'Could not fetch users.' });
  }
});

/* ── GET /api/admin/users/:id ── */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const payments = await Payment.find({ userId: user._id }).sort({ createdAt: -1 });
    res.json({ user: user.toJSON(), payments });
  } catch {
    res.status(500).json({ error: 'Could not fetch user.' });
  }
});

/* ── PATCH /api/admin/users/:id/toggle ── */
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}.`, user: user.toJSON() });
  } catch {
    res.status(500).json({ error: 'Toggle failed.' });
  }
});

/* ── GET /api/admin/payments ── */
router.get('/payments', async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const [payments, total] = await Promise.all([
      Payment.find(filter).populate('userId', 'name email phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Payment.countDocuments(filter),
    ]);
    res.json({ payments, total, page: Number(page) });
  } catch {
    res.status(500).json({ error: 'Could not fetch payments.' });
  }
});

/* ── GET /api/admin/resources ── */
router.get('/resources', async (_req, res) => {
  try {
    const resources = await Resource.find({ isActive: true }).populate('uploadedBy', 'name').sort({ createdAt: -1 });
    res.json({ resources });
  } catch {
    res.status(500).json({ error: 'Could not fetch resources.' });
  }
});

module.exports = router;
