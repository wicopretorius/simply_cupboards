---
name: VPS deployment details
description: Full production deployment state — server, DB, PM2, nginx proxy config, CORS, and gotchas
type: project
originSessionId: 5c348687-b6e3-4f72-a7f7-1daccd294f29
---
## Server
- VPS: 102.208.228.30 (dead), Tailscale IP: **100.89.122.46** (use this)
- SSH: `root` / `3ygX%34Se33v^8` — connect via paramiko (sshpass not installed locally)
- OS: Linux, Node 22 via nvm (`~/.nvm`), PM2 with systemd startup (`pm2 startup`)
- DB: MariaDB 11.4.9 (HestiaCP built-in, port 3306) — **not MySQL**
- App root: `/root/dm-cupboards/` (not simply_cupboards)

**Why:** VPS is resource-constrained (4GB RAM, 2 vCPU) with WordPress co-hosted. No Docker.

## Database
```sql
CREATE DATABASE dm_cupboards CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dm_cupboards_user'@'localhost' IDENTIFIED BY '<password>';
GRANT ALL PRIVILEGES ON dm_cupboards.* TO 'dm_cupboards_user'@'localhost';
```

## Key env files on VPS

`/root/dm-cupboards/directus/.env`:
```
DB_CLIENT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=dm_cupboards
DB_USER=dm_cupboards_user
DB_PASSWORD=PickAStrongPassword123!
PUBLIC_URL=https://api.dmcupboards.co.za
ADMIN_EMAIL=admin@dmcupboards.co.za
CORS_ENABLED=true
CORS_ORIGIN=https://app.dmcupboards.co.za
CORS_CREDENTIALS=true
```

`/root/dm-cupboards/app/.env.local`:
```
NEXT_PUBLIC_DIRECTUS_URL=https://api.dmcupboards.co.za
```

## PM2 process names
- `dm-cupboards-directus` — Directus on port 8055
- `dm-cupboards-app` — Next.js on port 3000
- Both use `exec_mode: 'fork'` (critical — see feedback_patterns.md)

## nginx proxy config
Location: `/home/jireh/conf/web/<domain>/nginx.ssl.conf`

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;   # or 8055 for api subdomain
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

⚠️ HestiaCP overwrites this file on SSL operations — must re-apply manually.

## Deploy / update steps
```bash
git pull
cd directus
node_modules/.bin/directus schema apply ./snapshots/$(ls snapshots | sort | tail -1) --yes
pm2 restart dm-cupboards-directus
# If app changed:
cd ../app && npm run build
pm2 restart dm-cupboards-app
```

## DNS
Cloudflare proxied A records:
- `app.dmcupboards.co.za` → 102.208.228.30
- `api.dmcupboards.co.za` → 102.208.228.30
- No www aliases (caused Let's Encrypt failure when DNS didn't exist)
