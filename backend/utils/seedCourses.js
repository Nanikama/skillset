const mongoose = require('mongoose');
const Course   = require('../models/Course');
require('dotenv').config();

const COURSES = [
  { name:'AFFILIATE MARKETING',     tag:'Marketing',    thumbnail:{ url:'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80' }, sortOrder:1  },
  { name:'INSTAGRAM MARKETING',     tag:'Social Media', thumbnail:{ url:'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&auto=format&fit=crop&q=80' }, sortOrder:2  },
  { name:'GRAPHIC DESIGNING',       tag:'Design',       thumbnail:{ url:'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&auto=format&fit=crop&q=80' }, sortOrder:3  },
  { name:'VIDEO EDITING',           tag:'Creative',     thumbnail:{ url:'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&auto=format&fit=crop&q=80' }, sortOrder:4  },
  { name:'FACEBOOK ADS',            tag:'Advertising',  thumbnail:{ url:'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&auto=format&fit=crop&q=80' }, sortOrder:5  },
  { name:'GOOGLE ADS',              tag:'Advertising',  thumbnail:{ url:'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=400&auto=format&fit=crop&q=80' }, sortOrder:6  },
  { name:'YOUTUBE MASTERY',         tag:'Content',      thumbnail:{ url:'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&auto=format&fit=crop&q=80' }, sortOrder:7  },
  { name:'CONTENT CREATION',        tag:'Creative',     thumbnail:{ url:'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=80' }, sortOrder:8  },
  { name:'SOCIAL MEDIA MANAGEMENT', tag:'Social Media', thumbnail:{ url:'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&auto=format&fit=crop&q=80' }, sortOrder:9  },
  { name:'DROP SHIPPING',           tag:'eCommerce',    thumbnail:{ url:'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&auto=format&fit=crop&q=80' }, sortOrder:10 },
  { name:'FREELANCING',             tag:'Career',       thumbnail:{ url:'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&auto=format&fit=crop&q=80' }, sortOrder:11 },
  { name:'WHATSAPP MARKETING',      tag:'Marketing',    thumbnail:{ url:'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=400&auto=format&fit=crop&q=80' }, sortOrder:12 },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/skillbrzee');
  const existing = await Course.countDocuments();
  if (existing > 0) { console.log('✅ Courses already seeded.'); process.exit(0); }
  const toInsert = COURSES.map((c, i) => ({ name: c.name, tag: c.tag, thumbnail: c.thumbnail, order: c.sortOrder ?? i, isActive: true }));
  await Course.insertMany(toInsert);
  console.log(`🌱 Seeded ${COURSES.length} courses.`);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
