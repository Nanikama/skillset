const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Payment  = require('../models/Payment');
const Resource = require('../models/Resource');
const { protect, adminOnly } = require('../middleware/auth');

/* ─────────────────────────────────────────────────────────────
   All admin routes require auth + admin role
───────────────────────────────────────────────────────────── */
router.use(protect, adminOnly);


/* ════════════════════════════════════════════════════════════
   1. STATS  —  GET /api/admin/stats
   Returns total users, files, revenue, enrollments, downloads
════════════════════════════════════════════════════════════ */
router.get('/stats', async (_req, res) => {
  try {
    const [
      totalUsers,
      totalFiles,
      paymentAgg,
      enrolledCount,
      downloadAgg,
      paidCount,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Resource.countDocuments({ isActive: true }),
      Payment.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      User.countDocuments({ 'enrolledPackages.0': { $exists: true } }),
      Resource.aggregate([{ $group: { _id: null, total: { $sum: '$downloads' } } }]),
      Payment.countDocuments({ status: 'paid' }),
    ]);

    res.json({
      totalUsers,
      totalFiles,
      enrolledCount,
      totalEnrollments : enrolledCount,
      totalRevenue     : paymentAgg[0]?.total  || 0,   // paise
      totalTransactions: paymentAgg[0]?.count  || 0,
      totalDownloads   : downloadAgg[0]?.total || 0,
      paidCount,
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    res.status(500).json({ error: 'Could not fetch stats.' });
  }
});


/* ════════════════════════════════════════════════════════════
   2. ANALYTICS  —  GET /api/admin/analytics
   Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
   Returns revenue totals, payment counts, new-user count
════════════════════════════════════════════════════════════ */
router.get('/analytics', async (req, res) => {
  try {
    const { from, to } = req.query;

    // Build date range filter
    const dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to)   dateFilter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const [paymentAgg, newUsers] = await Promise.all([
      Payment.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id           : null,
            totalRevenue  : { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
            totalPayments : { $sum: 1 },
            paidPayments  : { $sum: { $cond: [{ $eq: ['$status', 'paid'] },    1, 0] } },
            failedPayments: { $sum: { $cond: [{ $eq: ['$status', 'failed'] },  1, 0] } },
            pendingPayments:{ $sum: { $cond: [{ $in:  ['$status', ['pending','created']] }, 1, 0] } },
          },
        },
      ]),
      User.countDocuments({ role: 'user', ...dateFilter }),
    ]);

    const a = paymentAgg[0] || {};
    res.json({
      totalRevenue   : a.totalRevenue    || 0,   // paise
      totalPayments  : a.totalPayments   || 0,
      paidPayments   : a.paidPayments    || 0,
      failedPayments : a.failedPayments  || 0,
      pendingPayments: a.pendingPayments || 0,
      newUsers,
    });
  } catch (err) {
    console.error('[admin/analytics]', err);
    res.status(500).json({ error: 'Could not fetch analytics.' });
  }
});


/* ════════════════════════════════════════════════════════════
   3. PAYMENT STATS  —  GET /api/admin/payment-stats
   Quick summary of ALL-TIME payment counts + total revenue
════════════════════════════════════════════════════════════ */
router.get('/payment-stats', async (_req, res) => {
  try {
    const agg = await Payment.aggregate([
      {
        $group: {
          _id          : null,
          totalRevenue : { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
          paidCount    : { $sum: { $cond: [{ $eq: ['$status', 'paid'] },    1, 0] } },
          failedCount  : { $sum: { $cond: [{ $eq: ['$status', 'failed'] },  1, 0] } },
          pendingCount : { $sum: { $cond: [{ $in:  ['$status', ['pending','created']] }, 1, 0] } },
          totalCount   : { $sum: 1 },
        },
      },
    ]);

    const a = agg[0] || {};
    res.json({
      totalRevenue: a.totalRevenue || 0,   // paise
      paidCount   : a.paidCount    || 0,
      failedCount : a.failedCount  || 0,
      pendingCount: a.pendingCount || 0,
      totalCount  : a.totalCount   || 0,
    });
  } catch (err) {
    console.error('[admin/payment-stats]', err);
    res.status(500).json({ error: 'Could not fetch payment stats.' });
  }
});


/* ════════════════════════════════════════════════════════════
   4. ALL PAYMENTS  —  GET /api/admin/payments
   Query: page, limit, status, packageId, search, from, to, sort
════════════════════════════════════════════════════════════ */
router.get('/payments', async (req, res) => {
  try {
    const {
      page      = 1,
      limit     = 15,
      status,
      packageId,
      search,
      from,
      to,
      sort      = '-createdAt',
    } = req.query;

    // Base filter
    const filter = {};
    if (status)    filter.status    = status;
    if (packageId) filter.packageId = Number(packageId);
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    // Search by user name / email (requires join)
    let userIds = null;
    if (search) {
      const matchedUsers = await User.find({
        $or: [
          { name : { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      userIds = matchedUsers.map(u => u._id);

      // Also match razorpayPaymentId / packageName directly
      filter.$or = [
        { userId         : { $in: userIds } },
        { razorpayPaymentId: { $regex: search, $options: 'i' } },
        { packageName    : { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('userId', 'name email phone')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(filter),
    ]);

    // Flatten user info for frontend convenience
    const result = payments.map(p => {
      const obj = p.toObject();
      obj.userName  = p.userId?.name  || '';
      obj.userEmail = p.userId?.email || '';
      obj.userPhone = p.userId?.phone || '';
      return obj;
    });

    res.json({ payments: result, total, page: Number(page) });
  } catch (err) {
    console.error('[admin/payments]', err);
    res.status(500).json({ error: 'Could not fetch payments.' });
  }
});


/* ════════════════════════════════════════════════════════════
   5. SINGLE PAYMENT  —  GET /api/admin/payments/:id
════════════════════════════════════════════════════════════ */
router.get('/payments/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'Invalid payment ID.' });

    const payment = await Payment.findById(req.params.id)
      .populate('userId', 'name email phone enrolledPackages');

    if (!payment) return res.status(404).json({ error: 'Payment not found.' });

    const obj      = payment.toObject();
    obj.userName   = payment.userId?.name  || '';
    obj.userEmail  = payment.userId?.email || '';
    obj.userPhone  = payment.userId?.phone || '';

    res.json({ payment: obj });
  } catch (err) {
    console.error('[admin/payments/:id]', err);
    res.status(500).json({ error: 'Could not fetch payment.' });
  }
});


/* ════════════════════════════════════════════════════════════
   6. MARK PAYMENT PAID  —  PATCH /api/admin/payments/:id/mark-paid
   Manually confirms a payment and enrolls the user if not already enrolled
════════════════════════════════════════════════════════════ */
router.patch('/payments/:id/mark-paid', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'Invalid payment ID.' });

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });

    // Update payment status
    payment.status = 'paid';
    await payment.save();

    // Enroll user if not already enrolled in this package
    const user = await User.findById(payment.userId);
    if (user) {
      const alreadyEnrolled = user.enrolledPackages.some(
        ep => ep.packageId === payment.packageId
      );
      if (!alreadyEnrolled) {
        user.enrolledPackages.push({
          packageId  : payment.packageId,
          packageName: payment.packageName,
          amount     : payment.amount,
          enrolledAt : new Date(),
        });
        await user.save();
      }
    }

    res.json({ message: 'Payment marked as paid and user enrolled.', payment: payment.toObject() });
  } catch (err) {
    console.error('[admin/payments/:id/mark-paid]', err);
    res.status(500).json({ error: 'Could not update payment.' });
  }
});


/* ════════════════════════════════════════════════════════════
   7. ALL USERS  —  GET /api/admin/users
   Query: search, page, limit
════════════════════════════════════════════════════════════ */
router.get('/users', async (req, res) => {
  try {
    const { search, page = 1, limit = 15 } = req.query;

    const filter = { role: 'user' };
    if (search) {
      filter.$or = [
        { name : { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    res.json({ users: users.map(u => u.toJSON()), total, page: Number(page) });
  } catch (err) {
    console.error('[admin/users]', err);
    res.status(500).json({ error: 'Could not fetch users.' });
  }
});


/* ════════════════════════════════════════════════════════════
   8. SINGLE USER  —  GET /api/admin/users/:id
   Returns full profile + payment history
════════════════════════════════════════════════════════════ */
router.get('/users/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'Invalid user ID.' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const payments = await Payment.find({ userId: user._id })
      .sort({ createdAt: -1 });

    res.json({ user: user.toJSON(), payments });
  } catch (err) {
    console.error('[admin/users/:id]', err);
    res.status(500).json({ error: 'Could not fetch user.' });
  }
});


/* ════════════════════════════════════════════════════════════
   9. TOGGLE USER ACTIVE  —  PATCH /api/admin/users/:id/toggle
════════════════════════════════════════════════════════════ */
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'Invalid user ID.' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.isActive = !user.isActive;
    await user.save();
    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'}.`,
      user   : user.toJSON(),
    });
  } catch (err) {
    console.error('[admin/users/:id/toggle]', err);
    res.status(500).json({ error: 'Toggle failed.' });
  }
});


/* ════════════════════════════════════════════════════════════
   10. DELETE USER  —  DELETE /api/admin/users/:id
   Also cleans up their payments
════════════════════════════════════════════════════════════ */
router.delete('/users/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'Invalid user ID.' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Prevent deleting admin accounts
    if (user.role === 'admin')
      return res.status(403).json({ error: 'Cannot delete admin accounts.' });

    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Payment.deleteMany({ userId: req.params.id }),
    ]);

    res.json({ message: `User "${user.name}" and their payments deleted.` });
  } catch (err) {
    console.error('[admin/users/:id DELETE]', err);
    res.status(500).json({ error: 'Could not delete user.' });
  }
});


/* ════════════════════════════════════════════════════════════
   11. ALL RESOURCES  —  GET /api/admin/resources
   Query: search, category, visibility, page, limit, sort
════════════════════════════════════════════════════════════ */
router.get('/resources', async (req, res) => {
  try {
    const {
      search,
      category,
      visibility,
      page  = 1,
      limit = 15,
      sort  = '-createdAt',
    } = req.query;

    const filter = { isActive: true };
    if (category)   filter.category   = category;
    if (visibility) filter.visibility = visibility;
    if (search) {
      filter.$or = [
        { title   : { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { fileName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .populate('uploadedBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Resource.countDocuments(filter),
    ]);

    res.json({ resources, total, page: Number(page) });
  } catch (err) {
    console.error('[admin/resources]', err);
    res.status(500).json({ error: 'Could not fetch resources.' });
  }
});


/* ════════════════════════════════════════════════════════════
   12. PACKAGE BREAKDOWN  —  GET /api/admin/package-breakdown
   Returns per-package sales count + revenue
════════════════════════════════════════════════════════════ */
router.get('/package-breakdown', async (_req, res) => {
  try {
    const breakdown = await Payment.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id        : { packageId: '$packageId', packageName: '$packageName' },
          salesCount : { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.packageId': 1 } },
    ]);

    res.json({
      breakdown: breakdown.map(b => ({
        packageId  : b._id.packageId,
        packageName: b._id.packageName,
        salesCount : b.salesCount,
        totalAmount: b.totalAmount,   // paise
      })),
    });
  } catch (err) {
    console.error('[admin/package-breakdown]', err);
    res.status(500).json({ error: 'Could not fetch package breakdown.' });
  }
});


/* ════════════════════════════════════════════════════════════
   13. ENROLL USER MANUALLY  —  POST /api/admin/enroll
   Body: { userId, packageId, packageName, amount }
════════════════════════════════════════════════════════════ */
router.post('/enroll', async (req, res) => {
  try {
    const { userId, packageId, packageName, amount = 0 } = req.body;

    if (!userId || !packageId || !packageName)
      return res.status(400).json({ error: 'userId, packageId and packageName are required.' });

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ error: 'Invalid userId.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const alreadyEnrolled = user.enrolledPackages.some(
      ep => ep.packageId === Number(packageId)
    );
    if (alreadyEnrolled)
      return res.status(409).json({ error: 'User is already enrolled in this package.' });

    user.enrolledPackages.push({
      packageId  : Number(packageId),
      packageName: String(packageName),
      amount     : Number(amount),
      enrolledAt : new Date(),
    });
    await user.save();

    // Create a manual payment record
    await Payment.create({
      userId     : user._id,
      packageId  : Number(packageId),
      packageName: String(packageName),
      amount     : Number(amount),
      status     : 'paid',
      isDev      : true,
    });

    res.json({ message: `${user.name} enrolled in ${packageName}.`, user: user.toJSON() });
  } catch (err) {
    console.error('[admin/enroll]', err);
    res.status(500).json({ error: 'Could not enroll user.' });
  }
});


/* ════════════════════════════════════════════════════════════
   14. REVOKE ENROLLMENT  —  DELETE /api/admin/enroll
   Body: { userId, packageId }
════════════════════════════════════════════════════════════ */
router.delete('/enroll', async (req, res) => {
  try {
    const { userId, packageId } = req.body;

    if (!userId || !packageId)
      return res.status(400).json({ error: 'userId and packageId are required.' });

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ error: 'Invalid userId.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const before = user.enrolledPackages.length;
    user.enrolledPackages = user.enrolledPackages.filter(
      ep => ep.packageId !== Number(packageId)
    );

    if (user.enrolledPackages.length === before)
      return res.status(404).json({ error: 'Enrollment not found.' });

    await user.save();
    res.json({ message: 'Enrollment revoked.', user: user.toJSON() });
  } catch (err) {
    console.error('[admin/enroll DELETE]', err);
    res.status(500).json({ error: 'Could not revoke enrollment.' });
  }
});


/* ════════════════════════════════════════════════════════════
   15. DASHBOARD SUMMARY  —  GET /api/admin/dashboard
   Single endpoint that returns everything the dashboard needs
════════════════════════════════════════════════════════════ */
router.get('/dashboard', async (_req, res) => {
  try {
    const [
      totalUsers,
      totalFiles,
      paymentAgg,
      enrolledCount,
      recentPayments,
      pkgBreakdown,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Resource.countDocuments({ isActive: true }),
      Payment.aggregate([
        {
          $group: {
            _id           : null,
            totalRevenue  : { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
            totalPayments : { $sum: 1 },
            paidPayments  : { $sum: { $cond: [{ $eq: ['$status', 'paid'] },    1, 0] } },
            failedPayments: { $sum: { $cond: [{ $eq: ['$status', 'failed'] },  1, 0] } },
          },
        },
      ]),
      User.countDocuments({ 'enrolledPackages.0': { $exists: true } }),
      Payment.find()
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(8),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        {
          $group: {
            _id        : { packageId: '$packageId', packageName: '$packageName' },
            salesCount : { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.packageId': 1 } },
      ]),
    ]);

    const a = paymentAgg[0] || {};

    res.json({
      stats: {
        totalUsers,
        totalFiles,
        enrolledCount,
        totalRevenue   : a.totalRevenue    || 0,
        totalPayments  : a.totalPayments   || 0,
        paidPayments   : a.paidPayments    || 0,
        failedPayments : a.failedPayments  || 0,
      },
      recentPayments: recentPayments.map(p => ({
        ...p.toObject(),
        userName : p.userId?.name  || '',
        userEmail: p.userId?.email || '',
      })),
      pkgBreakdown: pkgBreakdown.map(b => ({
        packageId  : b._id.packageId,
        packageName: b._id.packageName,
        salesCount : b.salesCount,
        totalAmount: b.totalAmount,
      })),
    });
  } catch (err) {
    console.error('[admin/dashboard]', err);
    res.status(500).json({ error: 'Could not fetch dashboard data.' });
  }
});


module.exports = router;
