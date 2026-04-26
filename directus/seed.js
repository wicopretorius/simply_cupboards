/**
 * Seed script — populates palette_items with the cabinet catalogue.
 * Run: npm run seed
 * Safe to re-run — skips items that already exist.
 */

const DIRECTUS_URL = process.env.PUBLIC_URL ?? 'http://localhost:8055'
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL    ?? 'cupboards@jirehsoft.com'
const ADMIN_PASS   = process.env.ADMIN_PASSWORD ?? 'admin_password_123'

const PALETTE_ITEMS = [
  // ── Base Units ─────────────────────────────────────────────────────────────
  { id: 'b2d600',  label: '2-Door',    sublabel: '600mm', width_mm: 600, doors: 2, is_drawer: false, is_appliance: false, default_row: 'base',  tab: 'Base Units' },
  { id: 'b1d400',  label: '1-Door',    sublabel: '400mm', width_mm: 400, doors: 1, is_drawer: false, is_appliance: false, default_row: 'base',  tab: 'Base Units' },
  { id: 'b3d900',  label: '3-Door',    sublabel: '900mm', width_mm: 900, doors: 3, is_drawer: false, is_appliance: false, default_row: 'base',  tab: 'Base Units' },
  { id: 'bdw600',  label: 'Drawers',   sublabel: '600mm', width_mm: 600, doors: 0, is_drawer: true,  is_appliance: false, default_row: 'base',  tab: 'Base Units' },
  { id: 'bsk600',  label: 'Sink Unit', sublabel: '600mm', width_mm: 600, doors: 2, is_drawer: false, is_appliance: false, default_row: 'base',  tab: 'Base Units' },
  { id: 'b1d600',  label: '1-Door',    sublabel: '600mm', width_mm: 600, doors: 1, is_drawer: false, is_appliance: false, default_row: 'base',  tab: 'Base Units' },

  // ── Upper Units ────────────────────────────────────────────────────────────
  { id: 'u2d600',  label: '2-Door',     sublabel: '600mm', width_mm: 600, doors: 2, is_drawer: false, is_appliance: false, default_row: 'upper', tab: 'Upper Units' },
  { id: 'u1d300',  label: '1-Door',     sublabel: '300mm', width_mm: 300, doors: 1, is_drawer: false, is_appliance: false, default_row: 'upper', tab: 'Upper Units' },
  { id: 'u3d900',  label: '3-Door',     sublabel: '900mm', width_mm: 900, doors: 3, is_drawer: false, is_appliance: false, default_row: 'upper', tab: 'Upper Units' },
  { id: 'ushf600', label: 'Open Shelf', sublabel: '600mm', width_mm: 600, doors: 0, is_drawer: false, is_appliance: false, default_row: 'upper', tab: 'Upper Units' },
  { id: 'u1d400',  label: '1-Door',     sublabel: '400mm', width_mm: 400, doors: 1, is_drawer: false, is_appliance: false, default_row: 'upper', tab: 'Upper Units' },
  { id: 'u2d800',  label: '2-Door',     sublabel: '800mm', width_mm: 800, doors: 2, is_drawer: false, is_appliance: false, default_row: 'upper', tab: 'Upper Units' },

  // ── Tall Units ─────────────────────────────────────────────────────────────
  { id: 'tl600',   label: 'Larder',     sublabel: '600mm', width_mm: 600, doors: 2, is_drawer: false, is_appliance: false, default_row: 'base',  tab: 'Tall Units' },
  { id: 'tp900',   label: 'Pantry',     sublabel: '900mm', width_mm: 900, doors: 3, is_drawer: false, is_appliance: false, default_row: 'base',  tab: 'Tall Units' },
  { id: 'tb300',   label: 'Broom',      sublabel: '300mm', width_mm: 300, doors: 1, is_drawer: false, is_appliance: false, default_row: 'base',  tab: 'Tall Units' },
  { id: 'tov600',  label: 'Oven Tower', sublabel: '600mm', width_mm: 600, doors: 2, is_drawer: false, is_appliance: false, default_row: 'base',  tab: 'Tall Units' },

  // ── Corner ─────────────────────────────────────────────────────────────────
  { id: 'cls900',  label: 'Lazy Susan',  sublabel: '900mm', width_mm: 900, doors: 2, is_drawer: false, is_appliance: false, default_row: 'base',  tab: 'Corner' },
  { id: 'clb900',  label: 'Corner Base', sublabel: '900mm', width_mm: 900, doors: 1, is_drawer: false, is_appliance: false, default_row: 'base',  tab: 'Corner' },
  { id: 'clu600',  label: 'Corner Upper',sublabel: '600mm', width_mm: 600, doors: 2, is_drawer: false, is_appliance: false, default_row: 'upper', tab: 'Corner' },

  // ── Appliances ─────────────────────────────────────────────────────────────
  { id: 'afr600',  label: 'Fridge Space', sublabel: '600mm', width_mm: 600, doors: 0, is_drawer: false, is_appliance: true, default_row: 'base',  tab: 'Appliances' },
  { id: 'aov600',  label: 'Oven Column',  sublabel: '600mm', width_mm: 600, doors: 0, is_drawer: false, is_appliance: true, default_row: 'base',  tab: 'Appliances' },
  { id: 'adw600',  label: 'Dishwasher',   sublabel: '600mm', width_mm: 600, doors: 0, is_drawer: false, is_appliance: true, default_row: 'base',  tab: 'Appliances' },
  { id: 'amw600',  label: 'Microwave',    sublabel: '600mm', width_mm: 600, doors: 0, is_drawer: false, is_appliance: true, default_row: 'upper', tab: 'Appliances' },
]

async function main() {
  // Login
  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  })
  const { data: auth, errors: loginErrors } = await loginRes.json()
  if (loginErrors) throw new Error(`Login failed: ${JSON.stringify(loginErrors)}`)
  const token = auth.access_token

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // Fetch existing IDs to skip duplicates
  const existingRes = await fetch(`${DIRECTUS_URL}/items/palette_items?fields=id&limit=-1`, { headers })
  const { data: existing } = await existingRes.json()
  const existingIds = new Set(existing.map(i => i.id))

  const toInsert = PALETTE_ITEMS.filter(item => !existingIds.has(item.id))

  if (toInsert.length === 0) {
    console.log('✓ palette_items already seeded — nothing to do.')
    return
  }

  // Insert in one batch request
  const res = await fetch(`${DIRECTUS_URL}/items/palette_items`, {
    method: 'POST',
    headers,
    body: JSON.stringify(toInsert),
  })
  const { data, errors } = await res.json()

  if (errors) throw new Error(`Seed failed: ${JSON.stringify(errors)}`)

  console.log(`✓ Seeded ${data.length} palette items:`)
  const byTab = {}
  data.forEach(item => { byTab[item.tab] = (byTab[item.tab] ?? 0) + 1 })
  Object.entries(byTab).forEach(([tab, count]) => console.log(`  ${tab}: ${count} items`))
}

main().catch(err => { console.error(err.message); process.exit(1) })
