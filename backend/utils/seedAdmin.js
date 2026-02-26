require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const User = require('../models/User');

module.exports = async function () {
  const email = process.env.ADMIN_EMAIL    || 'admin@skillbrzee.in';
  const pass  = process.env.ADMIN_PASSWORD || 'Admin@Skillbrzee123';

  try {
    const existing = await User.findOne({ email });

    if (existing) {
      // ✅ Always ensure role is admin even if it was created as 'user'
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log('✅ Admin role fixed for:', email);
      } else {
        console.log('ℹ️  Admin already exists and role is correct:', email);
      }
    } else {
      // ✅ Create fresh admin
      await User.create({
        name    : 'Skillbrzee Admin',
        email,
        phone   : '9573472183',
        password: pass,
        role    : 'admin',
        isActive: true,
      });
      console.log('✅ Admin user created:', email);
    }
  } catch (err) {
    console.error('❌ seedAdmin error:', err.message);
  }
};
