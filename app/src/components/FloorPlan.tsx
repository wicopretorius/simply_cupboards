'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readItem, readItems, createItem, updateItem, deleteItem } from '@directus/sdk'
import type { Design, FloorFixture, PaletteItem, WallDef } from '@/lib/types'
import { StatusBar, BottomNav, AppHeader, Spinner, TrashIcon } from './SharedUI'

const SVG_W      = 350
const FALLBACK_D = 3000   // mm depth when no room_shape
const CAB_BASE_D = 600
const CAB_UPPER_D = 300
const PAD        = 8      // SVG padding in px

type FType = FloorFixture['type']
interface LFix { dbId: number | null; iid: string; type: FType; x: number; y: number }

const uid = () => Math.random().toString(36).slice(2, 9)

const SZ: Record<FType, [number, number]> = {
  door:   [800, 800],
  window: [900, 150],
  basin:  [500, 400],
  stove:  [600, 600],
}
const CLR: Record<FType, string> = {
  door:   'rgba(122,168,224,0.85)',
  window: 'rgba(160,200,160,0.85)',
  basin:  'rgba(128,192,208,0.85)',
  stove:  'rgba(224,128,96,0.85)',
}
const LBL: Record<FType, string> = {
  door: 'Door', window: 'Window', basin: 'Basin', stove: 'Stove',
}

// ── Geometry ─────────────────────────────────────────────────────────────────

interface RoomGeometry {
  sc:        number    // px per mm
  svgH:      number    // SVG height in px
  offX:      number    // x offset to centre room in SVG
  offY:      number    // y offset
  bboxW:     number    // room bounding box width in mm
  bboxH:     number    // room bounding box height in mm
  polyPts:   string    // SVG points string for room polygon
  hasShape:  boolean
}

function computeGeometry(walls: WallDef[] | undefined, wallMm: number): RoomGeometry {
  if (!walls || walls.length === 0) {
    // Rectangle fallback
    const sc    = (SVG_W - PAD * 2) / wallMm
    const svgH  = Math.round(FALLBACK_D * sc + PAD * 2)
    const polyPts = `${PAD},${PAD} ${SVG_W - PAD},${PAD} ${SVG_W - PAD},${svgH - PAD} ${PAD},${svgH - PAD}`
    return { sc, svgH, offX: PAD, offY: PAD, bboxW: wallMm, bboxH: FALLBACK_D, polyPts, hasShape: false }
  }

  // Compute vertices from wall definitions
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  for (const w of walls) {
    const prev = pts[pts.length - 1]
    const rad  = (w.angleDeg * Math.PI) / 180
    pts.push({ x: prev.x + w.lengthMm * Math.cos(rad), y: prev.y - w.lengthMm * Math.sin(rad) })
  }

  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const bboxW = maxX - minX || 1000
  const bboxH = maxY - minY || 1000

  const sc   = Math.min((SVG_W - PAD * 2) / bboxW, (SVG_W - PAD * 2) / bboxH)
  const svgH = Math.round(bboxH * sc + PAD * 2)
  const offX = PAD + ((SVG_W - PAD * 2) - bboxW * sc) / 2
  const offY = PAD + ((svgH  - PAD * 2) - bboxH * sc) / 2

  const polyPts = pts.map(p =>
    `${offX + (p.x - minX) * sc},${offY + (p.y - minY) * sc}`
  ).join(' ')

  return { sc, svgH, offX, offY, bboxW, bboxH, polyPts, hasShape: true }
}

function toSvgPt(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint()
  pt.x = clientX; pt.y = clientY
  return pt.matrixTransform(svg.getScreenCTM()!.inverse())
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FloorPlan({ designId }: { designId: number }) {
  const router   = useRouter()
  const svgRef   = useRef<SVGSVGElement>(null)
  const fixRef   = useRef<LFix[]>([])

  const [design,  setDesign]  = useState<Design | null>(null)
  const [bases,   setBases]   = useState<number[]>([])
  const [uppers,  setUppers]  = useState<number[]>([])
  const [fixes,   setFixes]   = useState<LFix[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [sel,     setSel]     = useState<string | null>(null)
  const [addType, setAddType] = useState<FType>('basin')

  fixRef.current = fixes

  const geo = useMemo(() =>
    computeGeometry(design?.room_shape?.walls, design?.wall_mm ?? 4200),
    [design]
  )

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [des, cabs, fxs] = await Promise.all([
          directus.request(readItem('designs', designId, { fields: ['*'] })),
          directus.request(readItems('placed_cabinets', {
            filter: { design_id: { _eq: designId } },
            fields: ['*', 'palette_item_id.*'] as any,
            sort: ['row', 'sort'],
          })),
          directus.request(readItems('floor_fixtures', {
            filter: { design_id: { _eq: designId } },
          })),
        ])
        setDesign(des as Design)
        const arr = cabs as any[]
        setBases(arr.filter(c => c.row === 'base').map(c => (c.palette_item_id as PaletteItem).width_mm))
        setUppers(arr.filter(c => c.row === 'upper').map(c => (c.palette_item_id as PaletteItem).width_mm))
        setFixes((fxs as FloorFixture[]).map(f => ({ dbId: f.id, iid: uid(), type: f.type, x: f.x, y: f.y })))
      } catch {
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [designId, router])

  // ── Add fixture ───────────────────────────────────────────────────────────
  const addFixture = useCallback(() => {
    const [fw, fh] = SZ[addType]
    const fix: LFix = {
      dbId: null, iid: uid(), type: addType,
      x: Math.max(0, (geo.bboxW - fw) / 2),
      y: Math.max(0, (geo.bboxH - fh) / 2),
    }
    setFixes(p => [...p, fix])
    setSel(fix.iid)
    setSaving(true)
    directus.request(createItem('floor_fixtures', { design_id: designId, type: addType, x: fix.x, y: fix.y }))
      .then(r => setFixes(p => p.map(f => f.iid === fix.iid ? { ...f, dbId: (r as FloorFixture).id } : f)))
      .finally(() => setSaving(false))
  }, [addType, designId, geo])

  // ── Delete selected ───────────────────────────────────────────────────────
  const removeSel = useCallback(() => {
    const fx = fixRef.current.find(f => f.iid === sel)
    if (!fx) return
    setFixes(p => p.filter(f => f.iid !== sel))
    setSel(null)
    if (fx.dbId) directus.request(deleteItem('floor_fixtures', fx.dbId)).catch(console.error)
  }, [sel])

  // ── Drag fixture ──────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGRectElement>, iid: string) => {
    e.stopPropagation()
    setSel(iid)
    const el  = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const svg = svgRef.current!
    const sp  = toSvgPt(svg, e.clientX, e.clientY)
    const fx0 = fixRef.current.find(f => f.iid === iid)!
    const [fw, fh] = SZ[fx0.type]
    const { sc, bboxW, bboxH } = geo
    let moved = false

    const onMove = (ev: PointerEvent) => {
      const cp  = toSvgPt(svg, ev.clientX, ev.clientY)
      const dmx = (cp.x - sp.x) / sc
      const dmy = (cp.y - sp.y) / sc
      if (!moved && Math.hypot(dmx, dmy) < 5) return
      moved = true
      const nx = Math.max(0, Math.min(bboxW - fw, fx0.x + dmx))
      const ny = Math.max(0, Math.min(bboxH - fh, fx0.y + dmy))
      setFixes(p => p.map(f => f.iid === iid ? { ...f, x: nx, y: ny } : f))
    }

    const onUp = () => {
      el.removeEventListener('pointermove', onMove as EventListener)
      el.removeEventListener('pointerup', onUp)
      if (!moved) return
      const upd = fixRef.current.find(f => f.iid === iid)
      if (upd?.dbId) {
        setSaving(true)
        directus.request(updateItem('floor_fixtures', upd.dbId, { x: upd.x, y: upd.y }))
          .finally(() => setSaving(false))
      }
    }

    el.addEventListener('pointermove', onMove as EventListener)
    el.addEventListener('pointerup', onUp)
  }, [geo])

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <><StatusBar /><Spinner /><BottomNav designId={designId} /></>

  const { sc, svgH, offX, offY, bboxW, bboxH, polyPts, hasShape } = geo
  const wallMm = design?.wall_mm ?? 4200

  // Convert mm coordinates to SVG px
  const mmToSvg = (x: number, y: number) => ({ x: offX + x * sc, y: offY + y * sc })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <StatusBar />
      <AppHeader
        title={design?.name ?? 'Floor Plan'}
        subtitle={hasShape
          ? `${(bboxW / 1000).toFixed(1)}m × ${(bboxH / 1000).toFixed(1)}m`
          : `${(wallMm / 1000).toFixed(1)}m × ${(FALLBACK_D / 1000).toFixed(1)}m (default)`}
        onBack={() => router.push(`/wall-view/${designId}`)}
        actions={saving
          ? <span style={{ fontSize: 11, color: '#C8A96E', marginRight: 4 }}>Saving…</span>
          : undefined}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── SVG floor plan ── */}
        <div style={{ background: '#1A1917', borderRadius: 12, overflow: 'hidden', border: '1px solid #2A2825' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${svgH}`}
            style={{ display: 'block', width: '100%', height: 'auto' }}
            onClick={() => setSel(null)}
          >
            {/* Room fill */}
            <polygon points={polyPts} fill="#0F0F0E" />

            {/* Upper cabinets – dashed along top of room (first wall for polygon, top edge for rect) */}
            {(() => {
              let cx = 0
              return uppers.map((wm, i) => {
                const p1 = mmToSvg(cx, 0), p2 = mmToSvg(cx + wm, 0)
                const ph = CAB_UPPER_D * sc
                cx += wm
                return <rect key={i} x={p1.x} y={p1.y} width={Math.abs(p2.x - p1.x)} height={ph}
                  fill="rgba(42,40,37,0.9)" stroke="#3A3835" strokeWidth={1} strokeDasharray="4 2" />
              })
            })()}

            {/* Base cabinets – solid along bottom of room */}
            {(() => {
              let cx = 0
              return bases.map((wm, i) => {
                const p1 = mmToSvg(cx, bboxH - CAB_BASE_D)
                const ph = CAB_BASE_D * sc, pw = wm * sc
                cx += wm
                return <rect key={i} x={p1.x} y={p1.y} width={pw} height={ph}
                  fill="#2A2825" stroke="#3A3835" strokeWidth={1} />
              })
            })()}

            {/* Room outline */}
            <polygon points={polyPts} fill="none" stroke="#5A5550" strokeWidth={2} strokeLinejoin="round" />

            {/* Dimension labels */}
            <text x={SVG_W / 2} y={12} textAnchor="middle" fontSize={9} fill="#4A4845">
              {(bboxW / 1000).toFixed(1)}m
            </text>
            <text x={SVG_W - 6} y={svgH / 2} textAnchor="middle" fontSize={9} fill="#4A4845"
              transform={`rotate(-90,${SVG_W - 6},${svgH / 2})`}>
              {(bboxH / 1000).toFixed(1)}m
            </text>

            {/* Fixtures */}
            {fixes.map(fx => {
              const [fw, fh] = SZ[fx.type]
              const sp = mmToSvg(fx.x, fx.y)
              const pw = fw * sc, ph = fh * sc
              const isSelected = sel === fx.iid
              return (
                <g key={fx.iid}>
                  <rect
                    x={sp.x} y={sp.y} width={pw} height={ph}
                    fill={CLR[fx.type]} rx={3}
                    stroke={isSelected ? '#F2EDE6' : 'transparent'}
                    strokeWidth={isSelected ? 1.5 : 0}
                    style={{ cursor: 'grab', touchAction: 'none' }}
                    onPointerDown={e => handlePointerDown(e, fx.iid)}
                  />
                  {fx.type === 'stove' && [0, 1, 2, 3].map(i => (
                    <circle key={i}
                      cx={sp.x + (i % 2 === 0 ? 0.28 : 0.72) * pw}
                      cy={sp.y + (i < 2 ? 0.3 : 0.7) * ph}
                      r={Math.min(pw, ph) * 0.11} fill="rgba(0,0,0,0.25)"
                      style={{ pointerEvents: 'none' }} />
                  ))}
                  {fx.type === 'basin' && (
                    <ellipse cx={sp.x + pw / 2} cy={sp.y + ph / 2} rx={pw * 0.35} ry={ph * 0.3}
                      fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1}
                      style={{ pointerEvents: 'none' }} />
                  )}
                  {fx.type === 'door' && (
                    <path
                      d={`M ${sp.x + pw * 0.05} ${sp.y + ph * 0.95} A ${pw * 0.85} ${ph * 0.85} 0 0 1 ${sp.x + pw * 0.95} ${sp.y + ph * 0.05}`}
                      fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1}
                      style={{ pointerEvents: 'none' }} />
                  )}
                  {fx.type === 'window' && (
                    <line x1={sp.x + pw * 0.1} y1={sp.y + ph / 2} x2={sp.x + pw * 0.9} y2={sp.y + ph / 2}
                      stroke="rgba(0,0,0,0.3)" strokeWidth={1.5}
                      style={{ pointerEvents: 'none' }} />
                  )}
                  <text x={sp.x + pw / 2} y={sp.y + ph / 2 + 4} textAnchor="middle"
                    fontSize={Math.max(8, Math.min(11, ph * 0.18))} fill="#0F0F0E" fontWeight="600"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {LBL[fx.type]}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #2A2825', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 16, height: 10, background: '#2A2825', border: '1px solid #3A3835' }} />
              <span style={{ fontSize: 10, color: '#6A6560' }}>Base</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 16, height: 10, background: 'rgba(42,40,37,0.9)', border: '1px dashed #3A3835' }} />
              <span style={{ fontSize: 10, color: '#6A6560' }}>Upper (overhead)</span>
            </div>
            {!hasShape && (
              <button
                onClick={() => router.push(`/room-setup/${designId}`)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#C8A96E', fontSize: 10, fontWeight: 600 }}
              >
                Edit room shape →
              </button>
            )}
          </div>
        </div>

        {/* ── Fixture toolbar ── */}
        <div style={{ background: '#1A1917', borderRadius: 12, border: '1px solid #2A2825', padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Add Fixture
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['door', 'window', 'basin', 'stove'] as FType[]).map(t => (
              <button key={t} onClick={() => setAddType(t)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                background: addType === t ? CLR[t] : '#242220',
                color: addType === t ? '#0F0F0E' : '#6A6560',
                fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
              }}>
                {LBL[t]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addFixture} style={{
              flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#C8A96E,#A07840)',
              color: '#0F0F0E', fontSize: 13, fontWeight: 700,
            }}>
              + Place {LBL[addType]}
            </button>
            {sel && (
              <button onClick={removeSel} style={{
                padding: '11px 14px', borderRadius: 10,
                background: 'rgba(224,92,92,0.15)', border: '1px solid rgba(224,92,92,0.3)',
                color: '#E05C5C',
              }}>
                <TrashIcon />
              </button>
            )}
          </div>
          {sel && (
            <p style={{ fontSize: 11, color: '#6A6560', marginTop: 8, textAlign: 'center' }}>
              Drag fixture to reposition · tap trash to remove
            </p>
          )}
        </div>
      </div>

      <BottomNav designId={designId} />
    </div>
  )
}
