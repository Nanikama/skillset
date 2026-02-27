const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const crypto   = require('crypto');
const Resource = require('../models/Resource');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

/* ── Multer storage config ── */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../uploads/resources')),
  filename   : (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});
const ALLOWED_TYPES = /pdf|doc|docx|ppt|pptx|xls|xlsx|jpg|jpeg|png|gif|webp|mp4|zip|rar/;
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (ALLOWED_TYPES.test(ext)) cb(null, true);
    else cb(new Error(`File type .${ext} not allowed.`));
  },
});

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  if (ext === 'pdf')                    return 'pdf';
  if (['doc','docx','ppt','pptx','xls','xlsx'].includes(ext)) return 'doc';
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return 'img';
  return 'other';
}

/* ── GET /api/resources — public list ── */
// BEFORE (line ~37)
router.get('/', protect, async (req, res)

// AFTER
router.get('/', protect, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (!req.user) {
      filter.visibility = 'public';
    }
    if (category) filter.category = category;
    const resources = await Resource.find(filter).sort({ createdAt: -1 });
    res.json({ resources });
  } catch {
    res.status(500).json({ error: 'Could not fetch resources.' });
  }
});

/* ── POST /api/resources/upload — admin, file upload ── */
router.post('/upload', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, visibility } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });

    let fileUrl  = req.body.fileUrl || '';
    let fileName = req.body.fileName || '';

    if (req.file) {
      fileUrl  = `/uploads/resources/${req.file.filename}`;
      fileName = req.file.originalname;
    }

    if (!fileUrl) return res.status(400).json({ error: 'File or URL is required.' });

    const resource = await Resource.create({
      title,
      description: description || '',
      category   : category    || 'General',
      visibility : visibility  || 'enrolled',
      fileUrl,
      fileName,
      fileSize : req.file?.size || 0,
      fileType : getFileType(fileName || fileUrl),
      uploadedBy: req.user._id,
    });

    res.status(201).json({ message: 'Resource uploaded.', resource });
  } catch (err) {
    console.error('[upload]', err);
    res.status(500).json({ error: err.message || 'Upload failed.' });
  }
});

/* ── POST /api/resources/add-url — admin, URL-based resource ── */
router.post('/add-url', protect, adminOnly, async (req, res) => {
  try {
    const { title, description, category, visibility, fileUrl, fileName } = req.body;
    if (!title || !fileUrl) return res.status(400).json({ error: 'Title and URL are required.' });

    const resource = await Resource.create({
      title,
      description: description || '',
      category   : category    || 'General',
      visibility : visibility  || 'enrolled',
      fileUrl,
      fileName   : fileName || fileUrl.split('/').pop(),
      fileType   : getFileType(fileName || fileUrl),
      uploadedBy : req.user._id,
    });

    res.status(201).json({ message: 'Resource added.', resource });
  } catch {
    res.status(500).json({ error: 'Could not add resource.' });
  }
});

/* ── POST /api/resources/:id/download ── */
router.post('/:id/download', protect, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource || !resource.isActive) return res.status(404).json({ error: 'Resource not found.' });

    if (resource.visibility === 'enrolled' && !req.user) {
      return res.status(401).json({ error: 'Login required to download this resource.' });
    }

    await Resource.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
    res.json({ fileUrl: resource.fileUrl, fileName: resource.fileName });
  } catch {
    res.status(500).json({ error: 'Download failed.' });
  }
});

/* ── DELETE /api/resources/:id — admin ── */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Resource.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Resource deleted.' });
  } catch {
    res.status(500).json({ error: 'Delete failed.' });
  }
});

module.exports = router;
