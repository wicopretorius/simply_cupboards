import type { PaletteItem, CabinetTab, PlacedCabinet, FloorFixture, AppDesign } from "./types";

export const WALL_MM = 4200;

export const PALETTE: Record<CabinetTab, PaletteItem[]> = {
  "Base Units": [
    { id: "b2d600", label: "2-Door", sublabel: "600mm", widthMm: 600, doors: 2, defaultRow: "base" },
    { id: "b1d400", label: "1-Door", sublabel: "400mm", widthMm: 400, doors: 1, defaultRow: "base" },
    { id: "b3d900", label: "3-Door", sublabel: "900mm", widthMm: 900, doors: 3, defaultRow: "base" },
    { id: "bdw600", label: "Drawers",   sublabel: "600mm", widthMm: 600, doors: 0, isDrawer: true, defaultRow: "base" },
    { id: "bsk600", label: "Sink Unit", sublabel: "600mm", widthMm: 600, doors: 2, defaultRow: "base" },
    { id: "b1d600", label: "1-Door",    sublabel: "600mm", widthMm: 600, doors: 1, defaultRow: "base" },
  ],
  "Upper Units": [
    { id: "u2d600", label: "2-Door",     sublabel: "600mm", widthMm: 600, doors: 2, defaultRow: "upper" },
    { id: "u1d300", label: "1-Door",     sublabel: "300mm", widthMm: 300, doors: 1, defaultRow: "upper" },
    { id: "u3d900", label: "3-Door",     sublabel: "900mm", widthMm: 900, doors: 3, defaultRow: "upper" },
    { id: "ushf600", label: "Open Shelf",sublabel: "600mm", widthMm: 600, doors: 0, defaultRow: "upper" },
    { id: "u1d400", label: "1-Door",     sublabel: "400mm", widthMm: 400, doors: 1, defaultRow: "upper" },
    { id: "u2d800", label: "2-Door",     sublabel: "800mm", widthMm: 800, doors: 2, defaultRow: "upper" },
  ],
  "Tall Units": [
    { id: "tl600",  label: "Larder",     sublabel: "600mm", widthMm: 600, doors: 2, defaultRow: "base" },
    { id: "tp900",  label: "Pantry",     sublabel: "900mm", widthMm: 900, doors: 3, defaultRow: "base" },
    { id: "tb300",  label: "Broom",      sublabel: "300mm", widthMm: 300, doors: 1, defaultRow: "base" },
    { id: "tov600", label: "Oven Tower", sublabel: "600mm", widthMm: 600, doors: 2, defaultRow: "base" },
  ],
  "Corner": [
    { id: "cls900", label: "Lazy Susan",  sublabel: "900mm", widthMm: 900, doors: 2, defaultRow: "base" },
    { id: "clb900", label: "Corner Base", sublabel: "900mm", widthMm: 900, doors: 1, defaultRow: "base" },
    { id: "clu600", label: "Corner Upper",sublabel: "600mm", widthMm: 600, doors: 2, defaultRow: "upper" },
  ],
  "Appliances": [
    { id: "afr600", label: "Fridge Space", sublabel: "600mm", widthMm: 600, doors: 0, isAppliance: true, defaultRow: "base" },
    { id: "aov600", label: "Oven Column",  sublabel: "600mm", widthMm: 600, doors: 0, isAppliance: true, defaultRow: "base" },
    { id: "adw600", label: "Dishwasher",   sublabel: "600mm", widthMm: 600, doors: 0, isAppliance: true, defaultRow: "base" },
    { id: "amw600", label: "Microwave",    sublabel: "600mm", widthMm: 600, doors: 0, isAppliance: true, defaultRow: "upper" },
  ],
};

let _id = 200;
export const uid = () => `cab_${++_id}`;

const mb = (id: string): PlacedCabinet => ({
  instanceId: uid(),
  item: PALETTE["Base Units"].find(p => p.id === id) || PALETTE["Base Units"][0],
});
const mu = (id: string): PlacedCabinet => ({
  instanceId: uid(),
  item: PALETTE["Upper Units"].find(p => p.id === id) || PALETTE["Upper Units"][0],
});

export const INITIAL_BASE: PlacedCabinet[] = [mb("b2d600"), mb("b2d600"), mb("b1d400"), mb("b2d600")];
export const INITIAL_UPPER: PlacedCabinet[] = [mu("u2d600"), mu("u2d600"), mu("u1d400"), mu("u2d600")];

export const INITIAL_FIXTURES: FloorFixture[] = [
  { id: "f1", type: "window", x: 50, y: 2 },
  { id: "f2", type: "door",   x: 22, y: 97 },
  { id: "f3", type: "basin",  x: 10, y: 74 },
  { id: "f4", type: "stove",  x: 83, y: 74 },
];

export const INITIAL_DESIGNS: AppDesign[] = [
  {
    id: "d1", name: "Main Kitchen", sub: "North Wall · 4.2m wide",
    badge: "In Progress", bColor: "#C8A96E", bBg: "rgba(200,169,110,0.12)",
    variant: 0, baseCabinets: INITIAL_BASE.map(c => ({ ...c, instanceId: uid() })), upperCabinets: INITIAL_UPPER.map(c => ({ ...c, instanceId: uid() })),
  },
  {
    id: "d2", name: "Scullery", sub: "East Wall · 2.8m wide",
    badge: "Complete", bColor: "#6EC87A", bBg: "rgba(110,200,122,0.12)",
    variant: 1, baseCabinets: [mb("b2d600"), mb("bsk600")], upperCabinets: [mu("u2d600"), mu("ushf600")],
  },
  {
    id: "d3", name: "Bedroom BIC", sub: "South Wall · Draft",
    badge: "Draft", bColor: "#6A6560", bBg: "rgba(106,101,96,0.15)",
    variant: 2, baseCabinets: [], upperCabinets: [],
  },
];
