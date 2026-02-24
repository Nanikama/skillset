const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const fs        = require('fs');
require('dotenv').config();

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://skillset-1.onrender.com',       // ← Render frontend (static site)
  'https://skillset-g4oh.onrender.com',    // ← Render backend itself
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5002',
  'http://localhost:5500',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5002',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
  'null',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    if (/^https:\/\/[^.]+\.netlify\.app$/.test(origin)) return cb(null, true);
    if (/^https:\/\/[^.]+\.onrender\.com$/.test(origin)) return cb(null, true);
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors());

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter   = rateLimit({ windowMs: 15*60*1000, max: 25,  message: { error: 'Too many auth attempts. Try again in 15 min.' } });

app.use(globalLimiter);

// ── Require DB for API routes (except health, packages) ────────────────────────
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/packages')) return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database unavailable. Please start MongoDB or check MONGO_URI.' });
  }
  next();
});

// ── Static & uploads ─────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
const resourcesDir = path.join(uploadsDir, 'resources');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, require('./routes/auth'));
app.use('/api/packages',              require('./routes/packages'));
app.use('/api/courses',               require('./routes/courses'));
app.use('/api/payments',              require('./routes/payments'));
app.use('/api/resources',             require('./routes/resources'));
app.use('/api/files',                 require('./routes/files'));
app.use('/api/admin',                 require('./routes/admin'));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
  return res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: dbStatus,
  });
});

// ── Home Route ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('🚀 Skillbrzee API is running');
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.url} not found.` }));

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const { connect } = require('./config/database');

app.listen(PORT, () => {
  console.log(`🚀  Skillbrzee API  → http://localhost:${PORT}`);
  console.log(`🏥  Health check   → http://localhost:${PORT}/api/health`);
  connect()
    .then(async () => {
      console.log('✅  MongoDB connected');
      await require('./utils/seedAdmin')();
    })
    .catch(err => {
      console.warn('⚠️  MongoDB not available:', err.message);
      console.warn('   Start MongoDB or set MONGO_URL. API will return 503 for auth/courses/resources until connected.');
    });
});

module.exports = app;
