---
name: Room builder wall angle system
description: How wall angles are stored, converted, and displayed in RoomBuilder
type: project
originSessionId: 49eaa2d6-f235-484c-845c-750ec9a6c56d
---
**Storage**: absolute degrees (0=East/right, 90=North/up, 180=West/left, 270=South/down).

**Display**: relative clockwise turn from previous wall. 0°=straight, 90°=right turn, 180°=U-turn, 270°=left turn.

**Why:** Users think in terms of "turn right 90°" not absolute compass bearings.

**Conversion helpers** (in `RoomBuilder.tsx`):
```ts
function getRelAngle(walls: WallDef[], idx: number): number {
  if (idx === 0) return 0  // Wall 1 is the reference
  return (walls[idx - 1].angleDeg - walls[idx].angleDeg + 360) % 360
}
function relToAbsolute(walls: WallDef[], idx: number, relAngle: number): number {
  if (idx === 0) return walls[0].angleDeg
  return (walls[idx - 1].angleDeg - relAngle + 360) % 360
}
```

**Default new wall**: `(last.angleDeg - 90 + 360) % 360` — 90° right turn from previous = downward when starting horizontal. This draws rooms clockwise, matching the intuition of standing inside the room.

**Wall chips display**: `W{i+1} · {mm}mm · {i===0 ? 'ref' : getRelAngle(walls,i)+'° turn'}`

**How to apply:** Any UI showing angles should use `getRelAngle` for display and `relToAbsolute` when writing back from user input.
