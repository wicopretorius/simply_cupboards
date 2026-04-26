# Simply Cupboards

A mobile-first kitchen cabinet design app built with Next.js and Directus.

- **App**: `cupboards.jirehsoft.com`
- **API**: `api-cupboards.jirehsoft.com` (Directus)

## Local development

```bash
# 1. Start MySQL + phpMyAdmin
docker compose up -d

# 2. Start Directus (terminal 1)
cd directus && nvm use 22 && npm start

# 3. Start Next.js (terminal 2)
cd app && nvm use 22 && npm run dev
```

- Next.js: http://localhost:3000
- Directus: http://localhost:8055
- phpMyAdmin: http://localhost:8081

Copy `.env.example` → `.env` and `app/.env.example` → `app/.env.local` before first run.
