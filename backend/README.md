# Skillbrzee — Backend API

Full backend for the Skillbrzee learning platform frontend.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- Razorpay account ([sign up free](https://razorpay.com))

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Seed admin user
```bash
npm run seed-admin
```

### 5. Start the server
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server runs on **http://localhost:5000**

---

## ⚙️ Environment Variables (.env)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` or `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string for JWT signing |
| `JWT_EXPIRES_IN` | Token expiry e.g. `7d` |
| `RAZORPAY_KEY_ID` | Your Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Your Razorpay Key Secret |
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_USER` | Email address |
| `SMTP_PASS` | App password |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs |

---

## 📡 API Reference

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Register new user |
| POST | `/login` | ❌ | Login & get JWT |
| GET | `/me` | ✅ | Get current user |
| POST | `/refresh` | ❌ | Refresh access token |
| PATCH | `/update-profile` | ✅ | Update name/phone |
| POST | `/change-password` | ✅ | Change password |

### Courses (`/api/courses`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List all courses |
| POST | `/` | 🔑 Admin | Add course |
| PUT | `/:id` | 🔑 Admin | Update course |
| DELETE | `/:id` | 🔑 Admin | Remove course |

### Packages (`/api/packages`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List all packages |
| GET | `/:id` | ❌ | Get package by ID |

### Payments (`/api/payments`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create-order` | ✅ | Create Razorpay order |
| POST | `/verify` | ✅ | Verify & confirm payment |
| POST | `/dev-confirm` | ✅ | Confirm without Razorpay (dev only) |
| GET | `/my-payments` | ✅ | User's payment history |

### Resources (`/api/resources`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌/✅ | List resources (enrolled shows more) |
| POST | `/upload` | 🔑 Admin | Upload file |
| POST | `/add-url` | 🔑 Admin | Add URL-based resource |
| POST | `/:id/download` | ❌/✅ | Track download + get URL |
| DELETE | `/:id` | 🔑 Admin | Soft delete |

### Admin (`/api/admin`) — All require Admin JWT
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Dashboard stats |
| GET | `/users` | All users (paginated) |
| GET | `/users/:id` | User detail + payments |
| PATCH | `/users/:id/toggle` | Activate / deactivate user |
| GET | `/payments` | All payments |
| GET | `/resources` | All resources |

---

## 🔗 Connecting to the Frontend

In the HTML file, the `API_BASE` is already set to `http://localhost:5000/api` for local dev.

For production, update:
```javascript
const API_BASE = 'https://your-api-domain.com/api';
```

Or set it via localStorage (for quick testing):
```javascript
localStorage.setItem('sb_api_base', 'https://your-api-domain.com/api');
```

---

## 🏗️ Project Structure

```
skillbrzee-backend/
├── server.js              # Express app entry point
├── .env.example           # Environment template
├── models/
│   ├── User.js            # User schema + password hashing
│   ├── Payment.js         # Payment / order schema
│   ├── Resource.js        # Downloadable files schema
│   └── Course.js          # Course schema
├── routes/
│   ├── auth.js            # Register, login, profile
│   ├── payments.js        # Razorpay integration
│   ├── resources.js       # File uploads + downloads
│   ├── courses.js         # Course CRUD
│   ├── packages.js        # Package listing
│   └── admin.js           # Admin-only routes
├── middleware/
│   └── auth.js            # JWT protect + adminOnly guards
├── utils/
│   ├── jwt.js             # Token generation helpers
│   ├── email.js           # Nodemailer email templates
│   └── seedAdmin.js       # One-time admin seed script
└── uploads/
    └── resources/         # Uploaded files stored here
```

---

## 🔒 Security Notes

- Passwords are hashed with **bcrypt (12 rounds)**
- JWTs expire in 7 days by default
- Rate limiting: 200 req/15min globally, 20 req/15min on auth routes
- Helmet.js sets security HTTP headers
- File uploads limited to 50MB; only safe file types allowed
- Admin credentials are in `.env` — **never commit your `.env` file**

---

## 🚀 Deployment (Recommended: Railway / Render)

1. Push code to GitHub
2. Connect repo to [Railway](https://railway.app) or [Render](https://render.com)
3. Add environment variables in their dashboard
4. Use MongoDB Atlas as the database
5. Deploy — your API will get a public URL

---

## 📦 Dependencies

```
express            — Web framework
mongoose           — MongoDB ODM
bcryptjs           — Password hashing
jsonwebtoken       — JWT auth
cors               — Cross-origin requests
helmet             — Security headers
morgan             — HTTP request logging
razorpay           — Payment gateway
multer             — File upload middleware
uuid               — Unique filenames
nodemailer         — Transactional emails
express-rate-limit — Rate limiting
dotenv             — Environment variables
```
