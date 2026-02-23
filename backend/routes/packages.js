const express = require('express');
const router = express.Router();
const { PACKAGES, toDisplayFormat } = require('../config/packages');

/* ── GET /api/packages ── */
router.get('/', (_req, res) => {
  res.json({ packages: PACKAGES.map(toDisplayFormat) });
});

/* ── GET /api/packages/:id ── */
router.get('/:id', (req, res) => {
  const pkg = PACKAGES.find((p) => p.id === Number(req.params.id));
  if (!pkg) return res.status(404).json({ error: 'Package not found.' });
  res.json({ package: toDisplayFormat(pkg) });
});

module.exports = router;
