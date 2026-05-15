# MEMORY.md

- [Project stack and architecture](project_stack.md) — tech stack, URLs, key files, Directus collections, snapshot staleness (missing wall_height_mm, room_type, fixture fields)
- [VPS deployment details](deployment_vps.md) — server config, DB, PM2, nginx proxy, CORS, deploy steps
- [Coding patterns and lessons learned](feedback_patterns.md) — Directus SDK gotchas, auth catch patterns, PM2 fork mode, HestiaCP nginx overwrite
- [Room builder wall angle system](feature_wall_angles.md) — absolute storage, relative display, getRelAngle/relToAbsolute helpers
- [MyDesigns screen (home)](feature_discover.md) — card selection, mini floor plan preview, creation dialog, BottomNav designId wiring
- [FloorPlan component](feature_floorplan.md) — computeGeometry, fixture DnD, rotation/mirror, auto-save, handleDone
- [WallView component](feature_wallview.md) — cabinet DnD/reorder, wall canvas layout, windows in elevation, sill height editing
