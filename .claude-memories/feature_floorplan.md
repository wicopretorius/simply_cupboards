---
name: FloorPlan component — geometry, fixtures, and save behaviour
description: How FloorPlan renders the room, places fixtures, handles DnD, and saves
type: project
originSessionId: 5c348687-b6e3-4f72-a7f7-1daccd294f29
---
**Route:** `/floor-plan/[id]` → `FloorPlan` component (`app/src/components/FloorPlan.tsx`)

## Geometry
`computeGeometry(walls, wallMm, svgWidth)` → `RoomGeometry` (exported, used by FloorPlan and potentially WallView).
- No walls → 4200mm × 3000mm rectangle fallback
- Computes scale (`sc`), SVG height (`svgH`), polygon points string, bbox in mm
- Auto-scales if `svgH > availableH` (measures container with ResizeObserver)

## Fixtures
`SZ` record: `FType → [width_mm, height_mm]` (e.g. door: [800,800], window: [900,150])
`CLR` record: fill colours (gold=structure, blue=electrical, teal=plumbing)
`LBL` record: display names
`ROOM_FIXTURES`: filters palette by `design.room_type` (kitchen, bathroom, etc.)

**Fixture types**: door, window, sink, basin, stove, oven, socket, light_switch, db_board, drain

**Fixtures auto-save** as placed (`createItem`) and on drag-end (`updateItem`). Delete via `deleteItem`.

**DnD**: pointer events, 8px move threshold before activating drag, haptic vibrate on activate.
Uses `toSvgPt(svg, clientX, clientY)` to convert screen coords to SVG coords.

**Selected fixture** gets rotation controls (hold to accelerate) and mirror (door-only).

## Done / Save button
Calls `handleDone`:
- Updates designs: `badge: 'Floor Plan Done'`, `subtitle` with dimensions + fixture count
- Navigates to `/wall-view/${designId}`

**Room shape** is saved by RoomBuilder, not FloorPlan. FloorPlan reads it from `design.room_shape`.

## Floor plan index page (`/floor-plan`)
Lists all designs; tapping one navigates to `/floor-plan/${id}`.

**How to apply:** If adding more saveable state to FloorPlan, hook into `handleDone` or auto-save on change like fixtures do.
