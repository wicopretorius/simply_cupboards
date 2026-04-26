export type Screen = "discover" | "floorplan" | "wallview" | "login" | "profile";
export type CabinetTab = "Base Units" | "Upper Units" | "Tall Units" | "Corner" | "Appliances";
export type FloorTool = "Wall" | "Door" | "Window" | "Basin" | "Stove" | "Measure";

export interface PaletteItem {
  id: string;
  label: string;
  sublabel: string;
  widthMm: number;
  doors: number;
  isDrawer?: boolean;
  isAppliance?: boolean;
  defaultRow: "base" | "upper";
}

export interface PlacedCabinet {
  instanceId: string;
  item: PaletteItem;
}

export interface FloorFixture {
  id: string;
  type: "door" | "window" | "basin" | "stove";
  x: number; // % 0-100 from left
  y: number; // % 0-100 from top
}

export interface AppDesign {
  id: string;
  name: string;
  sub: string;
  badge: "In Progress" | "Complete" | "Draft";
  bColor: string;
  bBg: string;
  variant: number;
  baseCabinets: PlacedCabinet[];
  upperCabinets: PlacedCabinet[];
}

export interface AppState {
  designs: AppDesign[];
  activeDesignId: string;
  fixtures: FloorFixture[];
}
