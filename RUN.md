# Run Commands — Verified

## Exact Commands (from project root: `skillbree-project/`)

```bash
# Install
npm run install:all

# Run both frontend + backend
npm run dev
```

## What Runs

| Service   | URL                    | Port |
|-----------|------------------------|------|
| Frontend  | http://localhost:3000  | 3000 |
| Backend   | http://localhost:5002  | 5002 |
| Health    | http://localhost:5002/api/health | - |

## Verified Output

```
🚀  Skillbrzee API  → http://localhost:5002
🏥  Health check   → http://localhost:5002/api/health
✅  MongoDB connected
✅ Admin user created: admin@skillbrzee.in
```

## Individual Commands

```bash
# Backend only
npm run start

# Backend with nodemon (auto-reload)
npm run dev:backend

# Seed admin (creates admin@skillbrzee.in if not exists)
npm run seed-admin
```

## Alternative: Run Frontend Separately

If `npm run dev` fails (e.g. Python not found):

```bash
# Terminal 1 — Backend
cd backend && npm start

# Terminal 2 — Frontend
cd frontend && npx serve -l 3000
```
