const express = require('express');
const router  = express.Router();
const Course  = require('../models/Course');
const { protect, adminOnly } = require('../middleware/auth');

/* ── GET /api/courses — public ── */
router.get('/', async (req, res) => {
  try {
    let courses = await Course.find({ isActive: true }).sort({ order: 1, createdAt: 1 });

    /* Seed fallback courses if DB is empty */
    if (courses.length === 0) {
      const SEED = [
        { name:'AFFILIATE MARKETING',     tag:'Marketing',    thumbnail:{url:'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80'} },
        { name:'INSTAGRAM MARKETING',     tag:'Social Media', thumbnail:{url:'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&auto=format&fit=crop&q=80'} },
        { name:'GRAPHIC DESIGNING',       tag:'Design',       thumbnail:{url:'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&auto=format&fit=crop&q=80'} },
        { name:'VIDEO EDITING',           tag:'Creative',     thumbnail:{url:'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&auto=format&fit=crop&q=80'} },
        { name:'FACEBOOK ADS',            tag:'Advertising',  thumbnail:{url:'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&auto=format&fit=crop&q=80'} },
        { name:'GOOGLE ADS',              tag:'Advertising',  thumbnail:{url:'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=400&auto=format&fit=crop&q=80'} },
        { name:'YOUTUBE MASTERY',         tag:'Content',      thumbnail:{url:'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&auto=format&fit=crop&q=80'} },
        { name:'CONTENT CREATION',        tag:'Creative',     thumbnail:{url:'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=80'} },
        { name:'SOCIAL MEDIA MANAGEMENT', tag:'Social Media', thumbnail:{url:'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&auto=format&fit=crop&q=80'} },
        { name:'DROP SHIPPING',           tag:'eCommerce',    thumbnail:{url:'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&auto=format&fit=crop&q=80'} },
        { name:'FREELANCING',             tag:'Career',       thumbnail:{url:'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&auto=format&fit=crop&q=80'} },
        { name:'WHATSAPP MARKETING',      tag:'Marketing',    thumbnail:{url:'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=400&auto=format&fit=crop&q=80'} },
      ];
      courses = await Course.insertMany(SEED.map((c, i) => ({ ...c, order: i })));
    }

    res.json({ courses });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch courses.' });
  }
});

/* ── POST /api/courses — admin add course ── */
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({ course });
  } catch {
    res.status(500).json({ error: 'Could not create course.' });
  }
});

/* ── PUT /api/courses/:id — admin update ── */
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ course });
  } catch {
    res.status(500).json({ error: 'Update failed.' });
  }
});

/* ── DELETE /api/courses/:id — admin ── */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Course.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Course removed.' });
  } catch {
    res.status(500).json({ error: 'Delete failed.' });
  }
});

module.exports = router;
