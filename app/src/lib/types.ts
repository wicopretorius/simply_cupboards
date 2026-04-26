export type CabinetTab = 'Base Units' | 'Upper Units' | 'Tall Units' | 'Corner' | 'Appliances'

export interface PaletteItem {
  id: string
  label: string
  sublabel: string
  width_mm: number
  doors: number
  is_drawer: boolean
  is_appliance: boolean
  default_row: 'base' | 'upper'
  tab: CabinetTab
}

export interface Design {
  id: number
  name: string
  subtitle: string
  badge: 'In Progress' | 'Complete' | 'Draft'
  wall_mm: number
  placed_cabinets?: PlacedCabinet[]
  floor_fixtures?: FloorFixture[]
  date_created?: string
  date_updated?: string
}

export interface PlacedCabinet {
  id: number
  design_id: number
  palette_item_id: string | PaletteItem
  row: 'base' | 'upper'
  sort: number
}

export interface FloorFixture {
  id: number
  design_id: number
  type: 'door' | 'window' | 'basin' | 'stove'
  x: number
  y: number
}

export interface DirectusSchema {
  palette_items: PaletteItem[]
  designs: Design[]
  placed_cabinets: PlacedCabinet[]
  floor_fixtures: FloorFixture[]
}

export const BADGE_STYLES: Record<Design['badge'], { color: string; bg: string }> = {
  'In Progress': { color: '#C8A96E', bg: 'rgba(200,169,110,0.12)' },
  'Complete':    { color: '#6EC87A', bg: 'rgba(110,200,122,0.12)' },
  'Draft':       { color: '#6A6560', bg: 'rgba(106,101,96,0.15)'  },
}
