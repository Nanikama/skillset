# Skillbree Project

Full-stack learning platform: static frontend + Node/Express backend.

---

## Folder Structure

```
skillbree-project/
├── frontend/          # Static HTML (deploy to Vercel)
│   ├── index.html
│   └── vercel.json
├── backend/           # Express API (deploy to Render)
│   ├── config/
│   │   ├── database.js   # DB connection — edit to switch databases
│   │   └── packages.js
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── .env.example
├── package.json       # Root scripts
├── render.yaml        # Render backend config
├── DATABASE.md        # Database setup & switching guide
└── README.md
```

---

## Quick Start (Local)

### 1. Install dependencies

```bash
cd skillbree-project
npm run install:all
```

### 2. Configure backend

```bash
cd backend
copy .env.example .env
# .env already has MONGO_URI (MongoDB Atlas). Set JWT_SECRET, RAZORPAY_*, etc.
# PORT=5002 by default (change if needed)
```

### 3. Start both servers

```bash
cd skillbree-project
npm run dev
```

- **Frontend:** http://localhost:3000  
- **Backend:** http://localhost:5002  
- **Health:** http://localhost:5002/api/health  

**Port in use?** Set `PORT=5002` (or another port) in `backend/.env` and update `PRODUCTION_API_BASE` / local API in `frontend/index.html` to match, or use `localStorage.setItem('sb_api_base', 'http://localhost:PORT/api')` in browser console.  

---

## Exact Run Commands

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install root + backend deps |
| `npm run dev` | Run backend + frontend together |
| `npm run start` | Backend only |
| `npm run dev:backend` | Backend with nodemon |
| `npm run seed-admin` | Create admin user |

---

## Database

- **Configured:** MongoDB Atlas (connection in `backend/.env` → `MONGO_URI`)
- **Credentials:** Never commit `.env`. Use `.env.example` as template.
- **Switching DBs:** See [DATABASE.md](DATABASE.md)

---

## Deployment

### Backend (Render)

1. Create Web Service at [render.com](https://render.com)
2. Connect repo, set **Root Directory** to `backend` (or use `render.yaml`)
3. **Build:** `npm install`
4. **Start:** `npm start`
5. Add env vars: `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `BASE_URL`, `RAZORPAY_*`, etc.

### Frontend (Vercel)

1. Import project at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Deploy (no build needed — static HTML)
4. Update `frontend/index.html` → `PRODUCTION_API_BASE` to your Render backend URL

---

## Environment Variables (Backend)

See `backend/.env.example` for full list. Required for production:

- `MONGO_URI` — MongoDB connection
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `FRONTEND_URL` — CORS (your Vercel URL)
- `BASE_URL` — Backend URL (for file links)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — Payments
