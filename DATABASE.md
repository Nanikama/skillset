# Database Configuration

## Current Setup: MongoDB

The backend uses **MongoDB** with Mongoose. Connection is configured in `backend/config/database.js`.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/skillbrzee` |
| `MONGODB_URI` | Alternative (same as above) | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |

---

## Switching Databases

### 1. MongoDB (Atlas / Local)

**Local:**
```env
MONGO_URI=mongodb://localhost:27017/skillbrzee
```

**MongoDB Atlas (cloud):**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a cluster → Connect → Drivers → copy connection string
3. Replace `<password>` with your database user password
```env
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/skillbrzee?retryWrites=true&w=majority
```

### 2. Changing Database in the Future

1. **Edit** `backend/config/database.js`
2. Add a new `DATABASE_TYPE` case (e.g. `postgres`)
3. Implement `connect()` and `getConnection()` for the new DB
4. Update models in `backend/models/` to use the new ODM/ORM

---

## Where to Update Credentials

| File | Purpose |
|------|---------|
| `backend/.env` | **Actual credentials** (never commit; copy from `.env.example`) |
| `backend/.env.example` | Template — documents all variables |

---

## Database Details Needed (for new setup)

If deploying fresh, you need:

1. **MongoDB URI** — from MongoDB Atlas or local install
2. **Database name** — e.g. `skillbrzee` (can be in the URI)

No schema migrations required — Mongoose creates collections on first use.
