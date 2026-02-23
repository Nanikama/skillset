require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');

module.exports = async function () {
  // MongoDB connection is already established by server.js
  // Don't reconnect or disconnect here to avoid breaking the connection

  const email = process.env.ADMIN_EMAIL    || 'admin@skillbrzee.in';
  const pass  = process.env.ADMIN_PASSWORD || 'Admin@Skillbrzee123';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('ℹ️  Admin already exists:', email);
  } else {
    await User.create({
      name: 'Skillbrzee Admin',
      email,
      phone: '9573472183',
      password: pass,
      role: 'admin'
    });
    console.log('✅ Admin user created:', email);
  }
};