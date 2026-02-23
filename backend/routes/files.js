const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const db      = require('../utils/db');
const { protect, adminOnly } = require('../middleware/auth');

/* ─── Multer storage ─── */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '_' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /pdf|doc|docx|ppt|pptx|xls|xlsx|jpg|jpeg|png|gif|webp|mp4|zip|rar|txt/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    cb(null, allowed.test(ext));
  },
});

/* ══════════════════════════════════════════════════════
   GET /api/files/public
   Returns all public resources (no auth needed)
══════════════════════════════════════════════════════ */
router.get('/public', (_req, res) => {
  const files = db.findMany('files', f => f.visibility === 'public');
  return res.json({ files: files.reverse() });
});

/* ══════════════════════════════════════════════════════
   GET /api/files/enrolled
   Returns public + enrolled files for logged-in users
══════════════════════════════════════════════════════ */
router.get('/enrolled', protect, (req, res) => {
  const hasEnrollment = (req.user?.enrolledPackages?.length || 0) > 0;
  const files = db.findAll('files').filter(f => {
    if (f.visibility === 'public') return true;
    if (f.visibility === 'enrolled' && hasEnrollment) return true;
    return false;
  });
  return res.json({ files: files.reverse() });
});

/* ══════════════════════════════════════════════════════
   GET /api/files/all  (admin)
══════════════════════════════════════════════════════ */
router.get('/all', protect, adminOnly, (req, res) => {
  return res.json({ files: db.findAll('files').reverse() });
});

/* ══════════════════════════════════════════════════════
   POST /api/files/upload  (admin — actual file)
══════════════════════════════════════════════════════ */
router.post('/upload', protect, adminOnly, upload.single('file'), (req, res) => {
  const { title, category, visibility, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  let fileUrl = '';
  let fileName = '';
  let fileSize = 0;

  if (req.file) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    fileUrl  = `${baseUrl}/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
    fileSize = req.file.size;
  } else if (req.body.url) {
    fileUrl  = req.body.url;
    fileName = req.body.url.split('/').pop() || title;
  } else {
    return res.status(400).json({ error: 'No file or URL provided.' });
  }

  const record = db.insert('files', {
    title,
    category:   category || 'General',
    visibility: visibility || 'public',
    description: description || '',
    url:        fileUrl,
    fileName,
    fileSize,
    downloads:  0,
    uploadedBy: String(req.user._id),
  });

  return res.status(201).json({ file: record });
});

/* ══════════════════════════════════════════════════════
   POST /api/files/add-url  (admin — URL only, no file)
══════════════════════════════════════════════════════ */
router.post('/add-url', protect, adminOnly, (req, res) => {
  const { title, url, category, visibility, description } = req.body;
  if (!title || !url)
    return res.status(400).json({ error: 'Title and URL are required.' });

  const record = db.insert('files', {
    title,
    category:    category || 'General',
    visibility:  visibility || 'public',
    description: description || '',
    url,
    fileName:    url.split('/').pop() || title,
    fileSize:    0,
    downloads:   0,
    uploadedBy:  String(req.user._id),
  });

  return res.status(201).json({ file: record });
});

/* ══════════════════════════════════════════════════════
   POST /api/files/:id/download
   Increments download count
══════════════════════════════════════════════════════ */
router.post('/:id/download', (req, res) => {
  const file = db.findById('files', req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found.' });

  if (file.visibility === 'enrolled') {
    const auth = req.headers['authorization'] || '';
    if (!auth) return res.status(401).json({ error: 'Login required to download this file.' });
  }

  const updated = db.updateById('files', file.id, { downloads: (file.downloads || 0) + 1 });
  return res.json({ url: updated.url, downloads: updated.downloads });
});

/* ══════════════════════════════════════════════════════
   DELETE /api/files/:id  (admin)
══════════════════════════════════════════════════════ */
router.delete('/:id', protect, adminOnly, (req, res) => {
  const file = db.findById('files', req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found.' });

  // Delete from disk if it was a real upload
  if (file.url && file.url.includes('/uploads/')) {
    const diskPath = path.join(__dirname, '..', 'uploads', path.basename(file.url));
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
  }

  db.removeById('files', file.id);
  return res.json({ success: true });
});

/* ══════════════════════════════════════════════════════
   PUT /api/files/:id  (admin — update metadata)
══════════════════════════════════════════════════════ */
router.put('/:id', protect, adminOnly, (req, res) => {
  const { title, category, visibility, description } = req.body;
  const updated = db.updateById('files', req.params.id, { title, category, visibility, description });
  if (!updated) return res.status(404).json({ error: 'File not found.' });
  return res.json({ file: updated });
});

module.exports = router;
