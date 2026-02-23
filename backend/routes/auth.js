const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { protect } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/email');
const jwt      = require('jsonwebtoken');

/* ── POST /api/auth/register ── */
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered. Please log in.' });
    }

    const user  = await User.create({ name, email, phone, password });
    const token = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    sendWelcomeEmail({ to: user.email, name: user.name });

    res.status(201).json({
      message    : 'Account created successfully.',
      accessToken: token,
      refreshToken,
      user       : user.toJSON(),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    console.error('[register]', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/* ── POST /api/auth/login ── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token        = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      message    : 'Login successful.',
      accessToken: token,
      refreshToken,
      user       : user.toJSON(),
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/* ── GET /api/auth/me ── */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch user.' });
  }
});

/* ── POST /api/auth/refresh ── */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid refresh token.' });
    res.json({ accessToken: generateAccessToken(user._id) });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

/* ── PATCH /api/auth/update-profile ── */
router.patch('/update-profile', protect, async (req, res) => {
  try {
    const allowed = ['name', 'phone'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ message: 'Profile updated.', user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed.' });
  }
});

/* ── POST /api/auth/change-password ── */
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required.' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password too short.' });

    const user = await User.findById(req.user._id);
    const ok   = await user.comparePassword(currentPassword);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect.' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully.' });
  } catch {
    res.status(500).json({ error: 'Password change failed.' });
  }
});

module.exports = router;
