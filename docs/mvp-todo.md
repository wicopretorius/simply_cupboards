# DM Cupboards — MVP Todo

> Tracks what's built, what's in progress, and what needs to be done before launch.
> Update status as work is completed.

---

## Screens & Navigation

| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Login | `/login` | ✅ Done | DM Cupboards logo, email/password, link to signup |
| Signup | `/signup` | ✅ Done | First/last name, email, password — assigns Free role |
| My Designs (Home) | `/designs` | ✅ Done | Card list, mini floor plan preview, create dialog, design limit gate |
| Room Builder | `/room-setup/[id]` | ✅ Done | Wall-by-wall room shape editor, angle system |
| Floor Plan | `/floor-plan/[id]` | ✅ Done | Fixture DnD, rotation/mirror, auto-save, windows/doors |
| Floor Plan Index | `/floor-plan` | ✅ Done | Lists designs to pick from |
| Wall View (Cabinets) | `/wall-view/[id]` | ✅ Done | Cabinet DnD/reorder, elevation view, window rendering, sill height editing |
| Profile | `/profile` | ✅ Done | Avatar upload, name/email/phone, change password, sign out |
| Admin Panel | `/admin` | ✅ Done | User list, role selector, subscription dates, indefinite toggle |

---

## Auth & Roles

| Item | Status | Notes |
|------|--------|-------|
| Login / logout | ✅ Done | Cookie-based auth, SameSite=None for cross-subdomain |
| Signup → Free role | ✅ Done | Public registration enabled in Directus |
| Role-based access hook (`useRole`) | ✅ Done | UUID→name map, `atLeast()`, `isAdmin` |
| Tier limits (`tiers.ts`) | ✅ Done | `TIER_LIMITS`, `atDesignLimit()`, `atCabinetLimit()` |
| Design limit enforced | ✅ Done | Checked in MyDesigns before opening create dialog |
| Cabinet limit enforced | ❌ Todo | `atCabinetLimit()` exists but not wired in WallView |
| Admin menu visible to admins | ✅ Done | Hamburger icon on Designs screen (Admin/Administrator only) |

---

## Profile Page

| Item | Status | Notes |
|------|--------|-------|
| Load & display user details | ✅ Done | first_name, last_name, email, phone |
| Save profile | ✅ Done | PATCH /users/me |
| Avatar upload (camera/gallery) | ✅ Done | Blob fetch for cross-origin display |
| Change password | ✅ Done | |
| Business profile section | ❌ Todo | company_name, company_address, brand colors — fields exist in DB, no UI yet |
| Subscription status display | ❌ Todo | Show current tier, expiry date on profile |

---

## Admin Panel

| Item | Status | Notes |
|------|--------|-------|
| User list with role & subscription | ✅ Done | |
| Edit role | ✅ Done | Dropdown selector |
| Edit subscription dates | ✅ Done | Start, end date pickers |
| Indefinite access toggle | ✅ Done | |
| Client limit field | ❌ Todo | Field exists in DB (`client_limit`) — not in admin edit form yet |
| Linked business field | ❌ Todo | Field exists in DB (`linked_business`) — not in admin form yet |
| Search / filter users | ❌ Todo | Nice-to-have for when user list grows |

---

## Feature Gates (Tier Enforcement)

| Feature | Status | Notes |
|---------|--------|-------|
| Design limit | ✅ Done | Blocks Free users at 1 design |
| Cabinet limit | ❌ Todo | Wire `atCabinetLimit()` in WallView — block add when limit reached |
| Print 2D | ❌ Todo | Button to be added in WallView; gated to User+ |
| Cutting List | ❌ Todo | Button/screen to be added; gated to Designer+ |
| Store Pricing | ❌ Todo | Button/screen to be added; gated to Business+ |
| Upgrade prompt | ❌ Todo | Show upgrade message (from `upgradeMessage()`) when gate is hit |

---

## Cabinet Design (WallView)

| Item | Status | Notes |
|------|--------|-------|
| Cabinet DnD from palette | ✅ Done | |
| Cabinet reorder on wall | ✅ Done | |
| Base / Upper / Tall / Corner / Appliance tabs | ✅ Done | |
| Width display (used/total/free) | ✅ Done | Red highlight when over wall width |
| Window rendering in elevation | ✅ Done | Position, sill height, draggable |
| Cabinet face rendering | ✅ Done | Doors, drawers, appliance hatch |
| Delete cabinet | ✅ Done | |
| Cabinet limit enforcement | ❌ Todo | |
| Print 2D output | ❌ Todo | Generate printable elevation view |
| Cutting list output | ❌ Todo | Generate list of panels with dimensions |
| Pricing output | ❌ Todo | Calculate cost from palette_items pricing (fields TBD) |
| Mark design complete / badge | ❌ Todo | WallView has no "Done" button yet — FloorPlan does |

---

## Business & Client Features

| Item | Status | Notes |
|------|--------|-------|
| Business profile fields in UI | ❌ Todo | Fields in DB, not shown in profile page yet |
| White-label branding | ❌ Todo | Business brand colors applied to UI for their clients |
| Client account creation | ❌ Todo | Business creates Client users and links them |
| Client contact form | ❌ Todo | Simple form for Client → Business messaging (no real-time chat) |
| Client view of designs | ❌ Todo | Client can see the Business's designs, view-only |

---

## Infrastructure & Deployment

| Item | Status | Notes |
|------|--------|-------|
| VPS deploy script (`deploy.sh`) | ✅ Done | git pull → schema apply → build → pm2 restart |
| PM2 fork mode (both processes) | ✅ Done | Cluster mode caused port 8055 crash loop |
| Cross-origin cookie auth | ✅ Done | SameSite=None set on Directus |
| Static admin token | ✅ Done | `dmc_admin_s3cr3t_t0ken_2026` on admin@dmcupboards.co.za |
| Directus schema snapshot | ✅ Done | `snapshot-20260506.yaml` includes all custom user fields |
| Domain setup | ✅ Done | `app.dmcupboards.co.za` + `api.dmcupboards.co.za` via Cloudflare |
| Email / SMTP | ❌ Todo | Directus email not configured — needed for password reset |
| Password reset flow | ❌ Todo | Depends on SMTP setup |
| Payment integration | ❌ Future | Stripe or PayFast for subscription upgrades |

---

## Nice-to-Have (Post-MVP)

- Push notifications (design shared, subscription expiring)
- Design sharing between users
- PDF export of floor plan + elevation
- Cabinet pricing catalogue management UI (currently seeded via `seed.js`)
- Multi-wall view (currently only Wall 1 / first wall shown in elevation)
- 3D preview
- Mobile app wrapper (Capacitor/PWA)

---

## Known Issues / Tech Debt

- `project_stack.md` memory file references stale snapshot — updated via `snapshot-20260506.yaml`
- VPS only accessible via Tailscale `100.89.122.46` — old IP `102.208.228.30` times out
- Admin hamburger menu location (Designs screen) is not very discoverable — consider moving to Profile
- `deploy.sh` can fail if there are untracked files that conflict with incoming git changes (seen with snapshot file) — add `git clean -fd directus/snapshots/` to deploy script
