# DM Cupboards — Tiers & Subscription Model

> Living document. Update this as the pricing/feature model evolves.

---

## Roles

There are 7 roles in the system, mapped in `app/src/lib/useRole.ts` (UUID → name):

| Role | UUID | Notes |
|------|------|-------|
| Free | `6bd8db09-cbf3-425b-84da-4d4de2cfe11e` | Default on signup |
| User | `e95ff781-3bb4-4577-9104-a4a331d1942d` | Paid tier 1 |
| Designer | `6b8e134f-8922-445f-9fff-4f46a4ba8d4b` | Paid tier 2 |
| Business | `6d090944-4e51-438e-a9cb-5bf98b5612b2` | Paid tier 3 — enables white-label |
| Client | `54b85508-1d0c-4ca0-98e9-fe967c76d6a3` | Linked to a Business account, view-only |
| Admin | `7a39afe5-cf12-4886-b131-e19915e10111` | Internal staff |
| Administrator | `682ca723-eb53-447d-ab10-df9bb376056b` | Full system access |

Role promotion happens manually (Admin assigns via admin panel) or via a future payment/subscription flow.

---

## Feature Tiers

Defined in `app/src/lib/tiers.ts` — `TIER_LIMITS`.

| Feature | Free | User | Designer | Business | Client | Admin/Administrator |
|---------|------|------|----------|----------|--------|---------------------|
| Designs | 1 | 5 | 10 | Unlimited | 0 (view only) | Unlimited |
| Cabinets per design | 15 | Unlimited | Unlimited | Unlimited | 0 | Unlimited |
| Print 2D | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Cutting List | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ |
| Store Pricing | ✗ | ✗ | ✗ | ✓ | ✓ (view) | ✓ |
| Can design | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| White-label branding | ✗ | ✗ | ✗ | ✓ | — | — |

---

## Subscription Fields (on `directus_users`)

| Field | Type | Notes |
|-------|------|-------|
| `subscription_start_date` | date | When the subscription began |
| `subscription_end_date` | date | When it expires (null if indefinite) |
| `subscription_months` | integer | Duration in months (0 = not set) |
| `subscription_indefinite` | boolean | If true, no expiry enforced |

These are set by Admin via the Admin Panel (`/admin`). A future payment integration will set them automatically.

---

## Business Profile Fields (on `directus_users`)

Applies to Business role accounts only.

| Field | Type | Notes |
|-------|------|-------|
| `company_name` | string | Displayed to clients |
| `company_address` | text | Business address |
| `brand_primary_color` | string | Hex color for white-label UI |
| `brand_secondary_color` | string | Hex color for white-label UI |
| `client_limit` | integer | Max number of clients this Business can add |
| `linked_business` | string (UUID) | Set on Client users — points to their Business |

---

## Client Role

- Created and linked to a Business account by Admin or by the Business user themselves (future flow).
- Cannot create designs — view-only access to the Business's designs.
- Can see pricing (so the client knows what things cost).
- Contact/messaging to the Business: **simple contact form** (to be built — basic form, no real-time chat).

---

## Upgrade Path (current)

1. User signs up → gets **Free** role automatically.
2. User wants to upgrade → contacts business (simple contact form, to be implemented) or Admin promotes manually via `/admin`.
3. Admin sets role + subscription dates via Admin Panel.
4. Future: Stripe/PayFast payment flow sets role + subscription automatically.

---

## Enforcement Points (implemented)

- **Design limit**: checked in `MyDesigns` before opening the "New Design" dialog (`atDesignLimit()`).
- **Cabinet limit**: `atCabinetLimit()` helper exists in `tiers.ts` — enforcement in WallView TBD.

## Enforcement Points (not yet implemented)

- Cabinet limit in WallView
- Print 2D gate
- Cutting list gate
- Store pricing gate
- White-label branding (Business profile section in profile page)
- Client contact form
