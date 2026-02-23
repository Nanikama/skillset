# Security Notes

## Credentials

- **Never commit** `backend/.env` — it contains MongoDB URI, JWT secrets, and API keys.
- `.env` is in `.gitignore`.

## MongoDB Atlas

If your MongoDB URI was shared (e.g. in chat or logs), **rotate the password** immediately:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → Database Access → Edit user
2. Edit password → create a new one
3. Update `backend/.env` → `MONGO_URI` with the new password
4. Restart the backend

## Production

- Use strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (e.g. `openssl rand -base64 64`)
- Set `NODE_ENV=production` on Render
- Add your Vercel URL to `FRONTEND_URL` for CORS
- Rotate `ADMIN_PASSWORD` after first login
