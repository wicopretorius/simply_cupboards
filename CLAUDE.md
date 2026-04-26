# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install      # install dependencies
pnpm run dev      # start dev server (Vite)
pnpm run build    # production build
```

There is no test runner or linter configured in this project.

## Architecture

This is a **Figma Make** export — a mobile-first React app (390×844px viewport) for designing kitchen cupboard layouts. It is a single-page app with client-side screen routing; there is no backend, router library, or external data fetching.

### Screen routing

`App.tsx` owns all shared state and renders one screen at a time via a `screen` string state variable (`"login" | "discover" | "floorplan" | "wallview" | "profile"`). `BottomNav` (from `SharedUI`) drives navigation between screens after login. Each screen component receives `onNavigate` and whatever slice of state it needs — there is no context or global store.

### State model (`src/app/types.ts` + `src/app/data.ts`)

- **`AppDesign`** — a named design project; holds `baseCabinets` and `upperCabinets` arrays of `PlacedCabinet`. Multiple designs live in `App.tsx`'s `designs` array; `activeDesignId` tracks which one the wall editor is working on.
- **`PlacedCabinet`** — a unique instance (`instanceId` from `uid()`) wrapping a `PaletteItem` catalog entry.
- **`PaletteItem`** — a cabinet type from the static `PALETTE` map keyed by `CabinetTab`. Width is always in millimetres; `WALL_MM = 4200` is the reference wall length used to compute pixel widths.
- **`FloorFixture`** — a door/window/basin/stove placed on the floor plan, stored as `x/y` percentages.

Mutations to `baseCabinets`/`upperCabinets` go through `setBaseCabinets`/`setUpperCabinets` helpers in `App.tsx`, which update the correct `AppDesign` inside the `designs` array and stamp `badge: "In Progress"`.

### Screen components (`src/app/components/`)

| File | Responsibility |
|---|---|
| `Login.tsx` | Email/password login form; calls `onLogin` on submit |
| `Discover.tsx` | Lists `AppDesign` cards; entry point after login |
| `FloorPlan.tsx` | 2-D room canvas with tool chips (Wall/Door/Window/Basin/Stove/Measure); places `FloorFixture` objects by click position as % of canvas |
| `WallView.tsx` | Main cabinet editor; drag-from-palette and drag-to-reorder using raw Pointer Events (not a DnD library) |
| `Profile.tsx` | User profile and design list |
| `SharedUI.tsx` | Shared primitives: `StatusBar`, `AppHeader`, `BottomNav`, `IconBtn`, and all inline SVG icons |

### Drag-and-drop in WallView

`WallView.tsx` implements its own pointer-event DnD without react-dnd. A `DragState` ref (`dragRef`) is updated in `window` `pointermove`/`pointerup` handlers. The drag activates after an 8px threshold. Drop position is computed by measuring the `baseRowRef`/`upperRowRef` DOM rects and finding the insertion index from the pointer X coordinate. A `DropIndicator` renders at the computed index while dragging.

### Styling conventions

All app UI uses **inline `style` objects** with hardcoded dark-theme color values — not Tailwind or CSS modules. The palette is:
- `#C8A96E` — gold accent / selection
- `#0F0F0E` / `#1A1917` / `#242220` — dark backgrounds
- `#F2EDE6` — primary text
- `#6A6560` — muted text
- `#E05C5C` — error / delete

The `src/app/components/ui/` directory contains a full **shadcn/ui** component library (Radix-based) plus MUI (`@mui/material`) — both are installed but **not used** by the app screens. `src/styles/theme.css` holds shadcn CSS variables. Do not use these for new app UI; follow the inline-style pattern used by the existing screens.

`vite.config.ts` registers a `figma:asset/` import alias that resolves to `src/assets/` — use this prefix when importing Figma-exported assets.
