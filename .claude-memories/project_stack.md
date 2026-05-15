---
name: Project stack and architecture
description: Tech stack, URLs, key files, Directus collections, DB schema vs code divergences, routing structure, and snapshot status
type: project
originSessionId: 5c348687-b6e3-4f72-a7f7-1daccd294f29
---
**Simply Cupboards** — mobile-first kitchen cabinet design app (390px wide UI).

**Stack**: Next.js 16.2.4 (App Router, TypeScript, inline styles — no Tailwind used for components), Directus 11.17.3 (headless CMS), MySQL 8. Font: DM Sans.

**Key URLs (local dev)**:
- App: `http://localhost:3000` (also `http://10.0.0.186:3000` or LAN IP for phone access)
- Directus: `http://10.0.0.186:8055` (set in `app/.env.local` as `NEXT_PUBLIC_DIRECTUS_URL`)
- Directus admin: `admin@simcup.com` / `admin_123`
- phpMyAdmin: `http://localhost:8081`

**Production URLs**:
- App: `https://app.dmcupboards.co.za` → `127.0.0.1:3000`
- Directus API: `https://api.dmcupboards.co.za` → `127.0.0.1:8055`
- VPS: 102.208.228.30 (HestiaCP, MariaDB 11.4.9, Node 22 via nvm, PM2)
- Directus admin: `admin@dmcupboards.co.za` (password set during bootstrap)
- Cloudflare proxied A records for both subdomains

**Why:** `NEXT_PUBLIC_DIRECTUS_URL` must use LAN IP, not `localhost` — phone resolves `localhost` as itself.

**Key files**:
- `app/src/lib/directus.ts` — singleton SDK client (`authentication('cookie')`)
- `app/src/lib/types.ts` — Design, WallDef, RoomDef, PaletteItem, FloorFixture, BADGE_STYLES, CabinetTab
- `app/src/components/SharedUI.tsx` — icons, IconBtn, StatusBar, AppHeader, BottomNav, Spinner
- `app/src/components/MyDesigns.tsx` — home screen (`/designs`), design list + card selection + MiniFloorPlan
- `app/src/components/RoomBuilder.tsx` — room wall editor (`/room-setup/[id]`)
- `app/src/components/FloorPlan.tsx` — floor plan editor (`/floor-plan/[id]`)
- `app/src/components/WallView.tsx` — cabinet wall editor (`/wall-view/[id]`)
- `app/src/components/Login.tsx` — login screen
- `directus/seed.js` — seeds palette_items catalogue (idempotent, `npm run seed`)
- `directus/snapshots/snapshot-20260427.yaml` — DB schema snapshot (**STALE** — see below)
- `ecosystem.config.js` — PM2 config for prod deploy

## App Router routes
- `/` → auth check, redirects to `/designs` or `/login`
- `/login` → Login component
- `/designs` → MyDesigns (home screen with design card list)
- `/floor-plan` → index page listing designs to select
- `/floor-plan/[id]` → FloorPlan component
- `/room-setup/[id]?from=<returnTo>` → RoomBuilder component (returnTo defaults to 'wall-view')
- `/wall-view/[id]` → WallView component
- `/profile` → Profile page (inline in page.tsx, not a separate component)

## Directus Collections (snapshot-confirmed fields)

### designs
`id`, `user_created`, `date_created`, `user_updated`, `date_updated`, `name`, `subtitle`, `badge` (Draft/In Progress/Complete, default Draft), `wall_mm` (int, default 4200), `room_shape` (JSON: `{ walls: WallDef[] }`)

### floor_fixtures
`id`, `design_id` (FK→designs CASCADE DELETE), `type` (door/window/basin/stove in snapshot, but code has more), `x` (float), `y` (float)

### palette_items
`id` (string/varchar PK e.g. 'b2d600'), `label`, `sublabel`, `width_mm`, `doors`, `is_drawer` (bool), `is_appliance` (bool), `default_row` (base/upper), `tab` (Base Units/Upper Units/Tall Units/Corner/Appliances)

### placed_cabinets
`id`, `design_id` (FK→designs CASCADE DELETE, sort_field=sort), `palette_item_id` (FK→palette_items), `row` (base/upper), `sort` (int, default 0)

## ⚠️ SNAPSHOT IS STALE — fields in live DB but NOT in snapshot-20260427.yaml

**designs table missing from snapshot:**
- `wall_height_mm` (int) — ceiling height in mm, used by RoomBuilder and WallView
- `room_type` (string: kitchen/bathroom/etc.) — used by MyDesigns (creation dialog) and FloorPlan (fixture type filtering)

**floor_fixtures table missing from snapshot:**
- `rotation` (float) — fixture rotation in degrees
- `mirrored` (boolean) — horizontal mirror, for door orientation
- `sill_height_mm` (int) — window sill height from floor in mm
- `width_mm` (float) — window width override in mm
- `height_mm` (float) — window height override in mm

Also: snapshot notes x/y as "% (0-100)" but code treats them as mm coordinates. Note is outdated.

The `floor_fixtures.type` choices in snapshot (door/window/basin/stove) are incomplete — code has: door, window, sink, basin, stove, oven, socket, light_switch, db_board, drain.

**Action:** Run `cd directus && npm run snapshot` to capture current live schema.

## Colour palette
- Backgrounds: `#0F0F0E`, `#141210`, `#1A1917`, `#242220`
- Cards/borders: `#2A2825`, `#3A3835`
- Text: `#F2EDE6` (primary), `#9A9590` (secondary), `#6A6560` (muted), `#4A4845` (dim)
- Gold accent: `#C8A96E` (primary), `#A07840` (darker)
- Error/delete: `#E05C5C`
- Electrical fixtures: `#6A9EC8`
- Plumbing: `#50B4C8`

## Wall measurement system
`WALL_MM = 4200` (reference wall width). Cabinet px = `(widthMm / wallMm) * containerPx`.
WallView: upper cabinets height=60px, base cabinets height=86px. Floor 22px, ceiling band 8px.

## nvm not available in Claude shell — use Directus REST API directly for schema operations.
