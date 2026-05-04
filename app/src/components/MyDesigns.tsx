'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readItems, readMe, createItem, updateItem } from '@directus/sdk'
import type { Design, RoomType, WallDef } from '@/lib/types'
import { BADGE_STYLES } from '@/lib/types'

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'kitchen',     label: 'Kitchen' },
  { value: 'bathroom',    label: 'Bathroom' },
  { value: 'bedroom',     label: 'Bedroom' },
  { value: 'livingroom',  label: 'Living Room' },
  { value: 'diningroom',  label: 'Dining Room' },
  { value: 'garage',      label: 'Garage' },
  { value: 'laundry',     label: 'Laundry' },
  { value: 'pantry',      label: 'Pantry' },
  { value: 'scullery',    label: 'Scullery' },
  { value: 'study',       label: 'Study' },
  { value: 'foyer',       label: 'Foyer' },
  { value: 'attic',       label: 'Attic' },
  { value: 'basement',    label: 'Basement' },
  { value: 'studio',      label: 'Studio' },
  { value: 'outbuilding', label: 'Outbuilding' },
]
import { BottomNav, BellIcon, SearchIcon, PlusIcon, IconBtn, Spinner } from './SharedUI'

// ── Mini floor plan preview ───────────────────────────────────────────────────

const PREV_W = 160, PREV_H = 90, PREV_PAD = 8

function MiniFloorPlan({ walls, wallMm }: { walls?: WallDef[]; wallMm: number }) {
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  const src = walls && walls.length > 0 ? walls : [
    { id: '', lengthMm: wallMm, angleDeg: 0 },
    { id: '', lengthMm: 3000,   angleDeg: 270 },
    { id: '', lengthMm: wallMm, angleDeg: 180 },
    { id: '', lengthMm: 3000,   angleDeg: 90  },
  ]
  for (const w of src) {
    const prev = pts[pts.length - 1]
    const rad  = (w.angleDeg * Math.PI) / 180
    pts.push({ x: prev.x + w.lengthMm * Math.cos(rad), y: prev.y - w.lengthMm * Math.sin(rad) })
  }
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rX = maxX - minX || 1, rY = maxY - minY || 1
  const sc = Math.min((PREV_W - PREV_PAD * 2) / rX, (PREV_H - PREV_PAD * 2) / rY)
  const ox = PREV_PAD + ((PREV_W - PREV_PAD * 2) - rX * sc) / 2
  const oy = PREV_PAD + ((PREV_H - PREV_PAD * 2) - rY * sc) / 2
  const svgPts = pts.map(p => `${ox + (p.x - minX) * sc},${oy + (p.y - minY) * sc}`).join(' ')
  return (
    <svg viewBox={`0 0 ${PREV_W} ${PREV_H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
      <polygon points={svgPts} fill="#0F0F0E" stroke="#5A5550" strokeWidth={1.5} strokeLinejoin="round" />
      <polygon points={svgPts} fill="none" stroke="#C8A96E" strokeWidth={0.5} strokeLinejoin="round" strokeDasharray="3 3" opacity={0.4} />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MyDesigns() {
  const router  = useRouter()
  const [designs, setDesigns] = useState<Design[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showDialog, setShowDialog]       = useState(false)
  const [newName, setNewName]             = useState('')
  const [newRoomType, setNewRoomType]     = useState<RoomType>('kitchen')
  const [selId, setSelId]                 = useState<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('last_sel_id')
    if (saved) setSelId(Number(saved))
  }, [])

  const handleSelect = (id: number | null) => {
    setSelId(id)
    if (id) localStorage.setItem('last_sel_id', String(id))
    else localStorage.removeItem('last_sel_id')
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [me, items] = await Promise.all([
          directus.request(readMe()),
          directus.request(readItems('designs', {
            sort: ['-date_updated'],
            fields: ['*'] as any,
          })),
        ])
        setUserEmail((me as { email: string }).email ?? '')
        setDesigns(items as unknown as Design[])
      } catch (err: any) {
        const status = err?.response?.status ?? err?.status
        if (status === 401 || status === 403) router.replace('/login')
        // other errors (network, missing field, etc.) — stay on page
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const openDialog = () => { setNewName(''); setNewRoomType('kitchen'); setShowDialog(true) }

  const createDesign = async () => {
    const name = newName.trim() || 'New Design'
    setShowDialog(false)
    setCreating(true)
    try {
      const design = await directus.request(createItem('designs', {
        name,
        subtitle: 'Draft · no room yet',
        badge: 'Draft',
        wall_mm: 4200,
        room_type: newRoomType,
      }))
      const newId = (design as Design).id
      localStorage.setItem('last_sel_id', String(newId))
      router.push(`/room-setup/${newId}?from=floor-plan`)
    } finally {
      setCreating(false)
    }
  }

  const firstName = userEmail.split('@')[0] ?? 'there'



  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>


      {/* Top bar */}
      <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: '#6A6560', fontWeight: 500 }}>Good morning,</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F2EDE6', textTransform: 'capitalize' }}>{firstName}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <IconBtn><SearchIcon /></IconBtn>
          <IconBtn><BellIcon /></IconBtn>
        </div>
      </div>

      {/* Section header */}
      <div style={{ padding: '16px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#F2EDE6' }}>Designs</div>
        <button
          onClick={openDialog}
          disabled={creating}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(200,169,110,0.12)', border: '1px solid rgba(200,169,110,0.3)',
            borderRadius: 20, padding: '7px 14px',
            color: '#C8A96E', fontSize: 12, fontWeight: 600,
            opacity: creating ? 0.6 : 1,
          }}
        >
          <PlusIcon size={14} />
          {creating ? 'Creating…' : 'New Design'}
        </button>
      </div>

      {/* Design list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
        {designs.length === 0 ? (
          <div style={{
            marginTop: 60, textAlign: 'center',
            color: '#4A4845', fontSize: 14,
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🪵</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No designs yet</div>
            <div style={{ fontSize: 12 }}>Tap &quot;New Design&quot; to get started</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {designs.map(design => {
              const { color, bg } = BADGE_STYLES[design.badge] ?? BADGE_STYLES['Draft']
              const isSel = selId === design.id
              return (
                <div
                  key={design.id}
                  onClick={() => handleSelect(isSel ? null : design.id)}
                  style={{
                    background: '#1A1917',
                    border: `1px solid ${isSel ? '#C8A96E' : '#2A2825'}`,
                    borderRadius: 16, padding: '16px 18px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* Badge */}
                  <div style={{ marginBottom: 10 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
                      color, background: bg,
                      padding: '4px 10px', borderRadius: 20,
                    }}>
                      {design.badge}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#F2EDE6', marginBottom: 4 }}>
                        {design.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#6A6560' }}>
                        {design.subtitle}
                      </div>
                    </div>
                    {/* Mini floor plan preview */}
                    <div
                      onClick={e => { e.stopPropagation(); router.push(`/floor-plan/${design.id}`) }}
                      style={{
                        width: 80, flexShrink: 0,
                        background: '#0F0F0E', borderRadius: 8,
                        border: `1px solid ${isSel ? '#3A3835' : '#2A2825'}`,
                        overflow: 'hidden',
                        cursor: 'pointer',
                      }}
                    >
                      <MiniFloorPlan walls={design.room_shape?.walls} wallMm={design.wall_mm ?? 4200} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{
                    marginTop: 14, paddingTop: 12, borderTop: `1px solid ${isSel ? '#3A3835' : '#2A2825'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 11, color: '#4A4845' }}>
                      Wall: {design.wall_mm}mm
                    </span>
                    {isSel ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/floor-plan/${design.id}`) }}
                          style={{
                            padding: '6px 12px', borderRadius: 8,
                            background: 'rgba(200,169,110,0.12)', border: '1px solid rgba(200,169,110,0.3)',
                            color: '#C8A96E', fontSize: 11, fontWeight: 600,
                          }}
                        >
                          Floorplan
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/wall-view/${design.id}`) }}
                          style={{
                            padding: '6px 12px', borderRadius: 8,
                            background: 'linear-gradient(135deg,#C8A96E,#A07840)',
                            border: 'none', color: '#0F0F0E', fontSize: 11, fontWeight: 700,
                          }}
                        >
                          Cupboards →
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: '#C8A96E', fontWeight: 600 }}>
                        Tap to select
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav designId={selId ?? undefined} />

      {/* Name dialog */}
      {showDialog && (
        <div
          onClick={() => setShowDialog(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: '#1A1917',
              borderRadius: '20px 20px 0 0',
              padding: '24px 24px 44px',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: '#F2EDE6', marginBottom: 20 }}>
              New Design
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Room Type
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
              {ROOM_TYPES.map(rt => (
                <button key={rt.value} onClick={() => setNewRoomType(rt.value)} style={{
                  padding: '7px 12px', borderRadius: 20,
                  background: newRoomType === rt.value ? 'rgba(200,169,110,0.18)' : '#242220',
                  border: `1px solid ${newRoomType === rt.value ? '#C8A96E' : '#3A3835'}`,
                  color: newRoomType === rt.value ? '#C8A96E' : '#6A6560',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  {rt.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Design Name
            </div>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createDesign()}
              placeholder={`e.g. ${ROOM_TYPES.find(r => r.value === newRoomType)?.label ?? 'My'} Remodel`}
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 12,
                background: '#0F0F0E', border: '1px solid #3A3835',
                color: '#F2EDE6', fontSize: 15, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                onClick={() => setShowDialog(false)}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 12,
                  background: '#242220', border: '1px solid #3A3835',
                  color: '#6A6560', fontSize: 14, fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={createDesign}
                style={{
                  flex: 2, padding: '13px 0', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg,#C8A96E,#A07840)',
                  color: '#0F0F0E', fontSize: 14, fontWeight: 700,
                }}
              >
                Create &amp; Design →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
