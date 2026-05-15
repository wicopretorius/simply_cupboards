---
name: WallView component — cabinet DnD, window elevation, and wall rendering
description: How WallView renders the wall elevation, handles cabinet drag-and-drop, and shows windows
type: project
originSessionId: 5c348687-b6e3-4f72-a7f7-1daccd294f29
---
**Route:** `/wall-view/[id]` → `WallView` component (`app/src/components/WallView.tsx`)

## Cabinet placement (DnD)
- Palette shows tabs: Base Units, Upper Units, Tall Units, Corner, Appliances
- Drag from palette onto wall → inserts at insertion index (DOM rect midpoint detection)
- Drag existing cabinet to reorder (within row or move to other row)
- Cabinet px width = `(widthMm / wallMm) * wallPx`
- `WallCabinet` has: `dbId` (null = pending), `instanceId` (local uid), `item` (PaletteItem), `row`, `sort`
- 8px threshold before activating drag; `dragRef` is a ref (not state) for performance
- On drop: `persistReorder` (updates all sort indices + row), or `persistAdd` then reorder

## Wall canvas layout (pixel positions)
- Upper cabinets: `top: 8px`, height 60px
- Base cabinets: `bottom: 22px` (above floor), height 86px
- Skirting board: `bottom: 108px`, height 7px
- Ceiling band: `top: 0`, height 8px (`#2E2C29`)
- Floor: `bottom: 0`, height 22px (repeating-linear-gradient tile pattern)
- Wall container measured by ResizeObserver (`wallContainerRef`) → `wallPx`, `wallHeightPx`

## Width display
Header chips: Base used/total, Upper used/total, Free remaining. Red highlight if base > wall width.

## Windows in elevation
`wallWindows` = floor_fixtures of type 'window' that are within `WIN_THRESH=350mm` perpendicular to Wall 1.
- Position computed using Wall 1 direction vector (`w1DirX/Y`) and normal (`w1NormX/Y`)
- Rendered as blue semi-transparent rectangles at correct elevation using `mmToElev()`
- `mmToElev(fromFloorMm)` = pixel from top = `wallHeightPx - FLOOR_PX - (fromFloor/wallHeightMm) * elevPx`
- Draggable in 2D: horizontal = along wall, vertical = sill height
- Tap selects window; shows edit panel (width_mm, height_mm, sill_height_mm) at bottom

## CabinetFace rendering
- Door lines drawn at 1/N intervals
- Drawer: horizontal dividers at 33% and 66%
- Appliance: diagonal hatch pattern
- Selected: gold top border glow, selection ring

## Palette scrollbar
Custom scrollbar thumb (`scrollThumb` state), updated on scroll and tab switch via `updateThumb()`.

## How to apply
When adding new fixture types that appear on the wall elevation, follow the `wallWindows` pattern — project fixture floor-plan coordinates onto Wall 1 direction/normal vectors to get distance-along and perpendicular-distance.
