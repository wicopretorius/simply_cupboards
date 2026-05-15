---
name: MyDesigns screen (home) — design card selection and navigation
description: How design cards work on /designs — selection, mini preview, creation dialog, navigation
type: project
originSessionId: 5c348687-b6e3-4f72-a7f7-1daccd294f29
---
**Route:** `/designs` → `MyDesigns` component (`app/src/components/MyDesigns.tsx`)

**Design cards are selectable** (tap = select, tap again = deselect). Tapping does NOT immediately navigate.

**Selected card** (gold border) shows two action buttons:
- **Floorplan** → `/floor-plan/${design.id}`
- **Cupboards →** → `/wall-view/${design.id}`

**Selected state persisted** via `localStorage.last_sel_id` so it survives page reloads.

**Mini floor plan preview** (`MiniFloorPlan` component, 80px wide, `PREV_W=160, PREV_H=90`) renders in every card's top-right corner:
- Clicking mini preview navigates to `/floor-plan/${design.id}`
- Uses `design.room_shape.walls` if present
- Falls back to a `wallMm × 3000mm` rectangle if no room shape yet
- SVG polygon with `#0F0F0E` fill, `#5A5550` stroke, faint gold dashed overlay

**New Design dialog** (bottom sheet): asks for room type (chip picker, 15 room types) and design name.
- Creates design with `badge: 'Draft'`, `wall_mm: 4200`, then navigates to `/room-setup/${newId}?from=floor-plan`

**BottomNav** receives `designId={selId ?? undefined}` so the "Floorplan" and "Cupboards" nav tabs link to the selected design.

**Auth catch pattern**: only redirects to `/login` on 401/403, not generic errors.

**How to apply:** When adding new entry points to floor plan or wall view, always route to `/floor-plan/${id}` and `/wall-view/${id}` — never to the bare routes.
