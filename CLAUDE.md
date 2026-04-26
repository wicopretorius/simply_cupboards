# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Simply Cupboards — a mobile-first kitchen cabinet design app. Originally a Figma Make export (React + Vite, `src/`), being migrated to Next.js 15 (`app/`) with Directus as the headless CMS backend.

Temporary domains (until simplycupboards.com is purchased):
- App: `cupboards.jirehsoft.com`
- Directus API: `api-cupboards.jirehsoft.com`

---

## Local development

### Prerequisites
- Docker (for MySQL + phpMyAdmin only)
- Node 22 via nvm (`nvm use 22` — see `.nvmrc`)

### Start database
```bash
docker compose up -d        # MySQL :3307, phpMyAdmin :8081
docker compose down
```

### Directus
```bash
cd directus
nvm use 22
npm install                 # first time only
npm start                   # http://localhost:8055
# First time only:
npm run bootstrap           # creates DB tables + admin user
```
- Admin: `cupboards@jirehsoft.com` / `admin_password_123`
- phpMyAdmin: `http://localhost:8081`

### Next.js app
```bash
cd app
npm install                 # first time only
npm run dev                 # http://localhost:3000
npm run build
```

### Directus schema workflow
After changing the data model in the Directus UI, snapshot and commit it:
```bash
cd directus
npm run snapshot            # saves to directus/snapshots/snapshot-YYYYMMDD.yaml
git add snapshots/ && git commit -m "chore: update Directus schema snapshot"
```

---

## Production (HestiaCP VPS)

Directus and Next.js run as native Node.js processes via PM2. **No Docker on the VPS** — too resource-constrained (4GB RAM, 2 vCPU) with WordPress sites co-hosted.

- MySQL: HestiaCP built-in (port 3306)
- Node.js: must be **v22 LTS** (see `.nvmrc`) — v25 breaks `isolated-vm` (Directus native module)

### First-time deploy
```bash
git clone https://github.com/wicopretorius/simply_cupboards.git
cd simply_cupboards

# Directus
cd directus
cp .env.example .env        # fill in HestiaCP MySQL creds + production URLs
npm install
npm run bootstrap           # creates DB tables + admin user

# Next.js
cd ../app
cp .env.example .env.local  # set NEXT_PUBLIC_DIRECTUS_URL=https://api-cupboards.jirehsoft.com
npm install
npm run build

# Start both with PM2
cd ..
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

### Apply schema on deploy
```bash
git pull
cd directus
node_modules/.bin/directus schema apply ./snapshots/$(ls snapshots | sort | tail -1) --yes
pm2 restart simply-cupboards-directus
```

### PM2 process names
- `simply-cupboards-directus` — Directus on port 8055
- `simply-cupboards-app` — Next.js on port 3000

### HestiaCP nginx proxy config
Point each domain to the local port:
- `cupboards.jirehsoft.com` → `127.0.0.1:3000`
- `api-cupboards.jirehsoft.com` → `127.0.0.1:8055`

---

## Architecture

### Stack
- **Frontend**: Next.js 15, App Router, TypeScript, Tailwind CSS
- **Backend**: Directus 11.17.3 (headless CMS + REST/GraphQL API)
- **Database**: MySQL 8.0
- **Directus SDK**: `app/src/lib/directus.ts` — singleton client using `NEXT_PUBLIC_DIRECTUS_URL`

### UI design reference

The original app was a mobile-first SPA (390×844px viewport). Key patterns to carry into Next.js:

- **5 screens**: login → discover → floorplan → wallview → profile
- **Dark colour palette**: `#C8A96E` gold accent, `#0F0F0E`/`#1A1917`/`#242220` backgrounds, `#F2EDE6` text, `#6A6560` muted, `#E05C5C` error/delete
- **WallView DnD**: custom pointer-event drag (8px threshold), insertion index from DOM rect — no DnD library
- **WALL_MM = 4200**: reference wall width in mm; cabinet pixel widths are `(widthMm / 4200) * containerPx`

### Next.js app (`app/`)
New screens go in `app/src/app/` using the App Router. Data fetching via the Directus SDK client in `app/src/lib/directus.ts`.
