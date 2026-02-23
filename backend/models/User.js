const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const enrolledPackageSchema = new mongoose.Schema({
  packageId  : { type: Number, required: true },
  packageName: { type: String, required: true },
  amount     : { type: Number, required: true },
  enrolledAt : { type: Date,   default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name    : { type: String, required: true, trim: true, maxlength: 100 },
  email   : { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone   : { type: String, required: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role    : { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  enrolledPackages: { type: [enrolledPackageSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

/* Hash password before saving */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* Compare passwords */
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/* Remove sensitive fields from JSON responses */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
