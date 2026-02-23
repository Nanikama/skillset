/**
 * Shared package definitions (used by payments and packages routes).
 * Prices are in PAISE (₹1 = 100 paise) for Razorpay compatibility.
 */
const PACKAGES = [
  { id: 1, name: 'STARTER PACKAGE', price: 50000, desc: 'Begin your digital journey with fundamental skills.', featured: false },
  { id: 2, name: 'BASIC PACKAGE', price: 149900, desc: 'Expand your knowledge with essential digital marketing modules.', featured: false },
  { id: 3, name: 'SILVER PACKAGE', price: 299900, desc: 'Build intermediate expertise with live mentoring and resources.', featured: false },
  { id: 4, name: 'GOLD PACKAGE', price: 549900, desc: 'Master advanced strategies with real-world case studies and 1:1 mentoring.', featured: true },
  { id: 5, name: 'DIAMOND PACKAGE', price: 999900, desc: 'Full suite of professional courses with personal mentoring and exclusive content.', featured: false },
  { id: 6, name: 'PREMIUM PACKAGE', price: 1499900, desc: 'The ultimate package — all courses, all features, lifetime access and dedicated support.', featured: false },
];

/** Format price in paise to display string (e.g. 50000 → "₹500", 149900 → "₹1,499") */
function formatPrice(paise) {
  const rupees = paise / 100;
  return '₹' + rupees.toLocaleString('en-IN');
}

/** For API display: add display fields */
function toDisplayFormat(pkg) {
  return {
    id: pkg.id,
    name: pkg.name,
    price: formatPrice(pkg.price),
    rawPrice: pkg.price / 100,
    desc: pkg.desc,
    featured: pkg.featured,
  };
}

module.exports = { PACKAGES, formatPrice, toDisplayFormat };
