'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readItem, readItems, createItem, updateItem, deleteItem } from '@directus/sdk'
import type { Design, FloorFixture, PaletteItem, WallDef } from '@/lib/types'
import { BottomNav, AppHeader, Spinner, TrashIcon, SaveIcon } from './SharedUI'
import { ensureSession } from '@/lib/auth'

const SVG_W      = 350
const FALLBACK_D = 3000   // mm depth when no room_shape
const CAB_BASE_D = 600
const CAB_UPPER_D = 300
const PAD        = 24     // SVG padding in px

type FType = FloorFixture['type']
interface LFix { dbId: number | null; iid: string; type: FType; x: number; y: number; rotation: number; mirrored: boolean; widthMm?: number; heightMm?: number }

const SA_WIN_WIDTHS = [305, 533, 1022, 1511, 2000, 2489]
const SA_WIN_HEIGHTS: { label: string; mm: number }[] = [
  { label: 'G-Type',     mm: 359  },
  { label: 'E-Type',     mm: 654  },
  { label: 'C-Type',     mm: 949  },
  { label: 'D-Type',     mm: 1245 },
  { label: 'D50-Type',   mm: 1540 },
  { label: 'D/S-Type',   mm: 1264 },
  { label: 'D50/S-Type', mm: 1559 },
  { label: 'G/C-Type',   mm: 1264 },
  { label: 'G/D-Type',   mm: 1559 },
  { label: 'G/D50-Type', mm: 1854 },
  { label: 'E/C-Type',   mm: 1559 },
  { label: 'E/D-Type',   mm: 1854 },
]

const uid = () => Math.random().toString(36).slice(2, 9)

// ── Geometry ─────────────────────────────────────────────────────────────────

export interface RoomGeometry {
  sc:        number    // px per mm
  svgH:      number    // SVG height in px
  offX:      number    // x offset to centre room in SVG
  offY:      number    // y offset
  bboxW:     number    // room bounding box width in mm
  bboxH:     number    // room bounding box height in mm
  polyPts:   string    // SVG points string for room polygon
  hasShape:  boolean
}

export function computeGeometry(walls: WallDef[] | undefined, wallMm: number, svgWidth: number = SVG_W): RoomGeometry {
  if (!walls || walls.length === 0) {
    // Rectangle fallback
    const sc    = (svgWidth - PAD * 2) / wallMm
    const svgH  = Math.round(FALLBACK_D * sc + PAD * 2)
    const polyPts = `${PAD},${PAD} ${svgWidth - PAD},${PAD} ${svgWidth - PAD},${svgH - PAD} ${PAD},${svgH - PAD}`
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

  const sc   = Math.min((svgWidth - PAD * 2) / bboxW, (svgWidth - PAD * 2) / bboxH)
  const svgH = Math.round(bboxH * sc + PAD * 2)
  const offX = PAD + ((svgWidth - PAD * 2) - bboxW * sc) / 2
  const offY = PAD + ((svgH  - PAD * 2) - bboxH * sc) / 2

  const polyPts = pts.map(p =>
    `${offX + (p.x - minX) * sc},${offY + (p.y - minY) * sc}`
  ).join(' ')

  return { sc, svgH, offX, offY, bboxW, bboxH, polyPts, hasShape: true }
}

export function toSvgPt(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint()
  pt.x = clientX; pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return pt
  return pt.matrixTransform(ctm.inverse())
}

// ── Shared Config ────────────────────────────────────────────────────────────

export const SZ: Record<FType, [number, number]> = {
  door:         [800,  800],
  window:       [900,  150],
  sink:         [800,  500],
  basin:        [500,  400],
  stove:        [600,  600],
  oven:         [600,  600],
  socket:       [200,  160],
  light_switch: [180,  120],
  db_board:     [600,  200],
  drain:        [100,  100],
}
export const CLR: Record<FType, string> = {
  door:         'rgba(200,169,110,0.28)',
  window:       'rgba(200,169,110,0.28)',
  sink:         'rgba(200,169,110,0.28)',
  basin:        'rgba(200,169,110,0.28)',
  stove:        'rgba(200,169,110,0.28)',
  oven:         'rgba(200,169,110,0.28)',
  socket:       'rgba(110,160,200,0.28)',
  light_switch: 'rgba(110,160,200,0.28)',
  db_board:     'rgba(110,160,200,0.28)',
  drain:        'rgba(80,180,200,0.28)',
}
export const LBL: Record<FType, string> = {
  door: 'Door', window: 'Window', sink: 'Sink', basin: 'Basin', stove: 'Stove', oven: 'Oven',
  socket: 'Socket', light_switch: 'Switch', db_board: 'DB Board', drain: 'Drain',
}

const ALL_TYPES = Object.keys(SZ) as FType[]

const PALETTE_TABS: { label: string; types: FType[] }[] = [
  { label: 'Windows',     types: ['window'] },
  { label: 'Doors',       types: ['door'] },
  { label: 'Electrical',  types: ['socket', 'light_switch', 'db_board'] },
  { label: 'Plumbing',    types: ['sink', 'basin', 'drain'] },
  { label: 'Appliances',  types: ['stove', 'oven'] },
]

const ROOM_FIXTURES: Partial<Record<string, FType[]>> = {
  kitchen:    ['door', 'window', 'sink', 'stove', 'oven', 'light_switch', 'socket', 'db_board'],
  bathroom:   ['door', 'window', 'basin', 'socket', 'light_switch', 'drain'],
  bedroom:    ['door', 'window', 'socket', 'light_switch'],
  livingroom: ['door', 'window', 'socket', 'light_switch', 'db_board'],
  diningroom: ['door', 'window', 'socket', 'light_switch'],
  garage:     ['door', 'window', 'socket', 'light_switch', 'db_board', 'drain'],
  laundry:    ['door', 'window', 'basin', 'socket', 'light_switch', 'drain'],
  pantry:     ['door', 'window', 'basin', 'socket', 'light_switch'],
  scullery:   ['door', 'window', 'basin', 'stove', 'socket', 'light_switch', 'drain'],
  study:      ['door', 'window', 'socket', 'light_switch'],
  foyer:      ['door', 'window', 'socket', 'light_switch'],
  attic:      ['door', 'window', 'socket', 'light_switch'],
  basement:   ['door', 'window', 'socket', 'light_switch', 'db_board', 'drain'],
  studio:     ['door', 'window', 'basin', 'stove', 'socket', 'light_switch'],
  outbuilding:['door', 'window', 'socket', 'light_switch', 'drain'],
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FloorPlan({ designId }: { designId: number }) {
  const router   = useRouter()
  const svgRef   = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fixRef   = useRef<LFix[]>([])

  const [design,  setDesign]  = useState<Design | null>(null)
  const [bases,   setBases]   = useState<number[]>([])
  const [uppers,  setUppers]  = useState<number[]>([])
  const [fixes,   setFixes]   = useState<LFix[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<boolean>(false)
  const [sel,     setSel]     = useState<string | null>(null)
  const draggingRef           = useRef<string | null>(null)
  const rotHoldTimeout        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rotHoldInterval       = useRef<ReturnType<typeof setInterval> | null>(null)
  const [addType,    setAddType]    = useState<FType>('window')
  const [palTab,     setPalTab]     = useState(0)
  const [winWidth,   setWinWidth]   = useState(1022)
  const [winHeight,  setWinHeight]  = useState(654)
  const [availableH, setAvailableH] = useState(400)

  fixRef.current = fixes

  // ── Auto-scale to fit ────────────────────────────────────────────────────
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return
      // The content area is the flex-1 div. We want to subtract the toolbar height and padding.
      // Toolbar is ~120px, header ~60px, nav ~70px.
      // Actually, we can just measure the container's clientHeight.
      const h = containerRef.current.clientHeight
      // Estimated fixtures toolbar is 135px, legend 35px, gaps/padding 50px
      setAvailableH(h - 180) 
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [loading])

  const geo = useMemo(() => {
    const baseGeo = computeGeometry(design?.room_shape?.walls, design?.wall_mm ?? 4200)
    // Adjust scale if svgH exceeds availableH
    if (baseGeo.svgH > availableH && availableH > 100) {
      const scaleDown = (availableH - PAD * 2) / baseGeo.bboxH
      return computeGeometry(design?.room_shape?.walls, design?.wall_mm ?? 4200, SVG_W * (scaleDown / baseGeo.sc))
    }
    return baseGeo
  }, [design, availableH])

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!await ensureSession()) { router.replace('/login'); return }
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
        setFixes((fxs as FloorFixture[]).map(f => ({ dbId: f.id, iid: uid(), type: f.type, x: f.x, y: f.y, rotation: f.rotation ?? 0, mirrored: f.mirrored ?? false, widthMm: f.width_mm ?? undefined, heightMm: f.height_mm ?? undefined })))
      } catch (err: any) {
        const status = err?.response?.status ?? err?.status
        router.replace(status === 403 ? '/designs' : '/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [designId, router])

  // ── Add fixture ───────────────────────────────────────────────────────────
  const addFixture = useCallback(() => {
    const isWin = addType === 'window'
    const fw = isWin ? winWidth  : SZ[addType][0]
    const fh = isWin ? 150       : SZ[addType][1]
    const fix: LFix = {
      dbId: null, iid: uid(), type: addType,
      x: Math.max(0, (geo.bboxW - fw) / 2),
      y: Math.max(0, (geo.bboxH - fh) / 2),
      rotation: 0, mirrored: false,
      ...(isWin ? { widthMm: winWidth, heightMm: winHeight } : {}),
    }
    setFixes(p => [...p, fix])
    setSel(fix.iid)
    setSaving(true)
    directus.request(createItem('floor_fixtures', { design_id: designId, type: addType, x: fix.x, y: fix.y, rotation: 0, mirrored: false, ...(isWin ? { width_mm: winWidth, height_mm: winHeight } : {}) }))
      .then(r => {
        const newId = (r as FloorFixture).id
        setFixes(p => p.map(f => f.iid === fix.iid ? { ...f, dbId: newId } : f))
        // Flush any rotation/position changes that happened before dbId was known
        const current = fixRef.current.find(f => f.iid === fix.iid)
        if (current && (current.rotation !== 0 || current.mirrored || current.x !== fix.x || current.y !== fix.y)) {
          directus.request(updateItem('floor_fixtures', newId, { x: current.x, y: current.y, rotation: current.rotation, mirrored: current.mirrored })).catch(console.error)
        }
      })
      .finally(() => setSaving(false))
  }, [addType, designId, geo, winWidth, winHeight])

  // ── Delete selected ───────────────────────────────────────────────────────
  const removeSel = useCallback(() => {
    const fx = fixRef.current.find(f => f.iid === sel)
    if (!fx) return
    setFixes(p => p.filter(f => f.iid !== sel))
    setSel(null)
    if (fx.dbId) directus.request(deleteItem('floor_fixtures', fx.dbId)).catch(console.error)
  }, [sel])

  // ── Adjust rotation by delta degrees ────────────────────────────────────
  const adjustRotation = useCallback((delta: number) => {
    const fx = fixRef.current.find(f => f.iid === sel)
    if (!fx) return
    const newRot = ((fx.rotation + delta) % 360 + 360) % 360
    setFixes(p => p.map(f => f.iid === sel ? { ...f, rotation: newRot } : f))
    if (fx.dbId) {
      setSaving(true)
      directus.request(updateItem('floor_fixtures', fx.dbId, { rotation: newRot }))
        .finally(() => setSaving(false))
    }
  }, [sel])

  const startRotHold = useCallback((delta: number) => {
    adjustRotation(delta)
    rotHoldTimeout.current = setTimeout(() => {
      rotHoldInterval.current = setInterval(() => adjustRotation(delta * 10), 120)
    }, 400)
  }, [adjustRotation])

  const stopRotHold = useCallback(() => {
    if (rotHoldTimeout.current) { clearTimeout(rotHoldTimeout.current); rotHoldTimeout.current = null }
    if (rotHoldInterval.current) { clearInterval(rotHoldInterval.current); rotHoldInterval.current = null }
  }, [])

  // ── Mirror door horizontally ──────────────────────────────────────────────
  const mirrorSel = useCallback(() => {
    const fx = fixRef.current.find(f => f.iid === sel)
    if (!fx) return
    const newMirrored = !fx.mirrored
    setFixes(p => p.map(f => f.iid === sel ? { ...f, mirrored: newMirrored } : f))
    if (fx.dbId) {
      setSaving(true)
      directus.request(updateItem('floor_fixtures', fx.dbId, { mirrored: newMirrored }))
        .finally(() => setSaving(false))
    }
  }, [sel])

  // ── Drag fixture ──────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent, iid: string) => {
    e.stopPropagation()
    e.preventDefault()  // block page scroll for this touch
    setSel(iid)
    ;(e.currentTarget as SVGElement).setPointerCapture(e.pointerId)

    const svg = svgRef.current!
    const sp  = toSvgPt(svg, e.clientX, e.clientY)
    const fx0 = fixRef.current.find(f => f.iid === iid)!
    const [szW, szH] = SZ[fx0.type]
    const fw = fx0.widthMm ?? szW
    const fh = fx0.type === 'window' ? 150 : szH
    const { sc, bboxW, bboxH } = geo
    let moved = false

    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 8) return
      if (!moved) {
        moved = true
        draggingRef.current = iid
        navigator.vibrate?.(40)  // haptic feedback when drag activates
      }

      const cp  = toSvgPt(svg, ev.clientX, ev.clientY)
      const dmx = (cp.x - sp.x) / sc
      const dmy = (cp.y - sp.y) / sc

      const nx = Math.max(0, Math.min(bboxW - fw, fx0.x + dmx))
      const ny = Math.max(0, Math.min(bboxH - fh, fx0.y + dmy))
      setFixes(p => p.map(f => f.iid === iid ? { ...f, x: nx, y: ny } : f))
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      draggingRef.current = null

      if (!moved) return
      const upd = fixRef.current.find(f => f.iid === iid)
      if (upd?.dbId) {
        setSaving(true)
        directus.request(updateItem('floor_fixtures', upd.dbId, { x: upd.x, y: upd.y }))
          .finally(() => setSaving(false))
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [geo])

  // ── Done ──────────────────────────────────────────────────────────────────
  const handleDone = useCallback(async () => {
    if (!design) return
    setSaving(true)
    const { bboxW, bboxH, hasShape: hs } = computeGeometry(design?.room_shape?.walls, design?.wall_mm ?? 4200)
    try {
      await directus.request(updateItem('designs', designId, {
        badge: 'Floor Plan Done',
        subtitle: hs
          ? `${(bboxW / 1000).toFixed(1)}m × ${(bboxH / 1000).toFixed(1)}m · ${fixes.length} fixture${fixes.length !== 1 ? 's' : ''}`
          : `${((design.wall_mm ?? 4200) / 1000).toFixed(1)}m · ${fixes.length} fixture${fixes.length !== 1 ? 's' : ''}`,
      }))
      router.push(`/wall-view/${designId}`)
    } catch {
      setSaving(false)
    }
  }, [design, designId, fixes, router])

  // ── Render ────────────────────────────────────────────────────────────────


  const { sc, svgH, offX, offY, bboxW, bboxH, polyPts, hasShape } = geo
  const wallMm = design?.wall_mm ?? 4200

  // Convert mm coordinates to SVG px
  const mmToSvg = (x: number, y: number) => ({ x: offX + x * sc, y: offY + y * sc })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      <AppHeader
        title={design?.name ?? 'Floorplan'}
        subtitle={hasShape
          ? `${(bboxW / 1000).toFixed(1)}m × ${(bboxH / 1000).toFixed(1)}m`
          : `${(wallMm / 1000).toFixed(1)}m × ${(FALLBACK_D / 1000).toFixed(1)}m (default)`}
        onBack={() => router.push('/designs')}
        actions={saving
          ? <span style={{ fontSize: 11, color: '#C8A96E', marginRight: 4 }}>Saving…</span>
          : (
            <button onClick={handleDone} style={{
              padding: '7px 14px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#C8A96E,#A07840)',
              color: '#0F0F0E', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <SaveIcon size={14} />
              Save
            </button>
          )}
      />

      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── SVG floor plan ── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1917', borderRadius: 12, overflow: 'hidden', border: '1px solid #2A2825', width: 'fit-content' }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${geo.bboxW * geo.sc + PAD * 2} ${svgH}`}
              style={{ display: 'block', width: geo.bboxW * geo.sc + PAD * 2, maxWidth: '100%', height: 'auto', touchAction: 'none' }}
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
              <text x={(geo.bboxW * geo.sc + PAD * 2) / 2} y={12} textAnchor="middle" fontSize={9} fill="#4A4845">
                {(bboxW / 1000).toFixed(1)}m
              </text>
              <text x={(geo.bboxW * geo.sc + PAD * 2) - 6} y={svgH / 2} textAnchor="middle" fontSize={9} fill="#4A4845"
                transform={`rotate(-90,${(geo.bboxW * geo.sc + PAD * 2) - 6},${svgH / 2})`}>
                {(bboxH / 1000).toFixed(1)}m
              </text>

              {/* Fixtures */}
              {fixes.filter(fx => fx.type in SZ).map(fx => {
                const [szW, szH] = SZ[fx.type]
                const fw = fx.widthMm ?? szW
                const fh = fx.type === 'window' ? 150 : szH
                const sp = mmToSvg(fx.x, fx.y)
                const pw = fw * sc, ph = fh * sc
                const cx = sp.x + pw / 2, cy = sp.y + ph / 2
                const isSelected = sel === fx.iid
                const rot = fx.rotation ?? 0
                const mirrored = fx.mirrored ?? false

                // Hit area covers rotated bounding box — use max dimension for safety
                const maxDim = Math.max(pw, ph) + 24

                return (
                  <g key={fx.iid}
                    onPointerDown={e => handlePointerDown(e, fx.iid)}
                    style={{ cursor: 'grab' }}
                    transform={rot ? `rotate(${rot},${cx},${cy})` : undefined}
                  >
                    {/* Invisible hit area (centred, covers rotated bounds) */}
                    <rect
                      x={cx - maxDim / 2} y={cy - maxDim / 2}
                      width={maxDim} height={maxDim}
                      fill="transparent"
                    />

                    {/* Visible fixture */}
                    {(() => {
                      const isElec  = fx.type === 'socket' || fx.type === 'light_switch' || fx.type === 'db_board'
                      const isPlumb = fx.type === 'drain'
                      const baseStroke = isElec ? '#6A9EC8' : isPlumb ? '#50B4C8' : '#C8A96E'
                      return (
                        <rect x={sp.x} y={sp.y} width={pw} height={ph}
                          fill={CLR[fx.type]} rx={3}
                          stroke={isSelected ? '#F2EDE6' : baseStroke}
                          strokeWidth={isSelected ? 2 : 1} />
                      )
                    })()}
                    {fx.type === 'stove' && [0, 1, 2, 3].map(i => (
                      <circle key={i}
                        cx={sp.x + (i % 2 === 0 ? 0.28 : 0.72) * pw}
                        cy={sp.y + (i < 2 ? 0.3 : 0.7) * ph}
                        r={Math.min(pw, ph) * 0.11} fill="rgba(160,130,80,0.5)"
                        stroke="#A07840" strokeWidth={0.5}
                        style={{ pointerEvents: 'none' }} />
                    ))}
                    {fx.type === 'sink' && (
                      <g style={{ pointerEvents: 'none' }}>
                        {/* Double bowl kitchen sink */}
                        {/* Left bowl */}
                        <rect x={sp.x + pw * 0.06} y={sp.y + ph * 0.1} width={pw * 0.41} height={ph * 0.78}
                          fill="rgba(160,130,80,0.15)" stroke="#A07840" strokeWidth={1} rx={2} />
                        <circle cx={sp.x + pw * 0.265} cy={sp.y + ph * 0.5} r={Math.min(pw * 0.41, ph * 0.78) * 0.12}
                          fill="none" stroke="#A07840" strokeWidth={0.8} />
                        {/* Right bowl */}
                        <rect x={sp.x + pw * 0.53} y={sp.y + ph * 0.1} width={pw * 0.41} height={ph * 0.78}
                          fill="rgba(160,130,80,0.15)" stroke="#A07840" strokeWidth={1} rx={2} />
                        <circle cx={sp.x + pw * 0.735} cy={sp.y + ph * 0.5} r={Math.min(pw * 0.41, ph * 0.78) * 0.12}
                          fill="none" stroke="#A07840" strokeWidth={0.8} />
                        {/* Tap — between bowls */}
                        <circle cx={cx} cy={sp.y + ph * 0.28} r={pw * 0.03}
                          fill="#A07840" />
                        <line x1={cx} y1={sp.y + ph * 0.28} x2={cx} y2={sp.y + ph * 0.5}
                          stroke="#A07840" strokeWidth={1} />
                      </g>
                    )}
                    {fx.type === 'basin' && (
                      <ellipse cx={cx} cy={cy} rx={pw * 0.35} ry={ph * 0.3}
                        fill="none" stroke="#A07840" strokeWidth={1}
                        style={{ pointerEvents: 'none' }} />
                    )}
                    {fx.type === 'door' && (
                      <g transform={mirrored ? `scale(-1,1) translate(${-(sp.x * 2 + pw)},0)` : undefined}
                        style={{ pointerEvents: 'none' }}>
                        <path
                          d={`M ${sp.x + pw * 0.05} ${sp.y + ph * 0.95} A ${pw * 0.85} ${ph * 0.85} 0 0 1 ${sp.x + pw * 0.95} ${sp.y + ph * 0.05}`}
                          fill="none" stroke="#A07840" strokeWidth={1} />
                      </g>
                    )}
                    {fx.type === 'window' && (
                      <line x1={sp.x + pw * 0.1} y1={cy} x2={sp.x + pw * 0.9} y2={cy}
                        stroke="#A07840" strokeWidth={1.5}
                        style={{ pointerEvents: 'none' }} />
                    )}
                    {fx.type === 'oven' && (
                      <g style={{ pointerEvents: 'none' }}>
                        {/* Oven door with window */}
                        <rect x={sp.x + pw * 0.1} y={sp.y + ph * 0.1}
                          width={pw * 0.8} height={ph * 0.8}
                          fill="none" stroke="#A07840" strokeWidth={1} rx={2} />
                        <rect x={sp.x + pw * 0.2} y={sp.y + ph * 0.2}
                          width={pw * 0.6} height={ph * 0.35}
                          fill="rgba(160,120,60,0.2)" stroke="#A07840" strokeWidth={0.8} rx={2} />
                        {/* Handle */}
                        <line x1={sp.x + pw * 0.25} y1={sp.y + ph * 0.65}
                          x2={sp.x + pw * 0.75} y2={sp.y + ph * 0.65}
                          stroke="#A07840" strokeWidth={2} strokeLinecap="round" />
                      </g>
                    )}
                    {fx.type === 'socket' && (
                      <g style={{ pointerEvents: 'none' }}>
                        {/* SA 3-pin socket — outer frame with perspective trapezoid */}
                        <line x1={sp.x} y1={sp.y} x2={sp.x + pw * 0.2} y2={sp.y + ph * 0.2} stroke="#6A9EC8" strokeWidth={1} />
                        <line x1={sp.x + pw} y1={sp.y} x2={sp.x + pw * 0.8} y2={sp.y + ph * 0.2} stroke="#6A9EC8" strokeWidth={1} />
                        <line x1={sp.x + pw} y1={sp.y + ph} x2={sp.x + pw * 0.8} y2={sp.y + ph * 0.8} stroke="#6A9EC8" strokeWidth={1} />
                        <line x1={sp.x} y1={sp.y + ph} x2={sp.x + pw * 0.2} y2={sp.y + ph * 0.8} stroke="#6A9EC8" strokeWidth={1} />
                        {/* Inner faceplate */}
                        <rect x={sp.x + pw * 0.18} y={sp.y + ph * 0.18} width={pw * 0.64} height={ph * 0.64}
                          fill="none" stroke="#6A9EC8" strokeWidth={1} />
                        {/* Top pin (earth) — vertical rect, centred */}
                        <rect x={cx - pw * 0.08} y={sp.y + ph * 0.28} width={pw * 0.16} height={ph * 0.18}
                          fill="rgba(106,158,200,0.5)" stroke="#6A9EC8" strokeWidth={0.8} rx={1} />
                        {/* Bottom-left pin (live) */}
                        <rect x={sp.x + pw * 0.25} y={sp.y + ph * 0.54} width={pw * 0.18} height={ph * 0.14}
                          fill="rgba(106,158,200,0.5)" stroke="#6A9EC8" strokeWidth={0.8} rx={1} />
                        {/* Bottom-right pin (neutral) */}
                        <rect x={sp.x + pw * 0.57} y={sp.y + ph * 0.54} width={pw * 0.18} height={ph * 0.14}
                          fill="rgba(106,158,200,0.5)" stroke="#6A9EC8" strokeWidth={0.8} rx={1} />
                      </g>
                    )}
                    {fx.type === 'light_switch' && (
                      <g style={{ pointerEvents: 'none' }}>
                        {/* Inner border */}
                        <rect x={sp.x + pw * 0.1} y={sp.y + ph * 0.1} width={pw * 0.8} height={ph * 0.8}
                          fill="none" stroke="#6A9EC8" strokeWidth={0.8} />
                        {/* Circle (pivot) — lower centre */}
                        <circle cx={cx} cy={sp.y + ph * 0.72} r={Math.min(pw, ph) * 0.12}
                          fill="none" stroke="#6A9EC8" strokeWidth={1} />
                        {/* Lever — diagonal from circle to upper-right */}
                        <line x1={cx} y1={sp.y + ph * 0.72}
                          x2={sp.x + pw * 0.72} y2={sp.y + ph * 0.22}
                          stroke="#6A9EC8" strokeWidth={1.2} strokeLinecap="round" />
                      </g>
                    )}
                    {fx.type === 'db_board' && (
                      <g style={{ pointerEvents: 'none' }}>
                        {/* Cabinet door */}
                        <rect x={sp.x + pw * 0.06} y={sp.y + ph * 0.08} width={pw * 0.88} height={ph * 0.84}
                          fill="none" stroke="#6A9EC8" strokeWidth={1} rx={1} />
                        {/* Name plate at top */}
                        <rect x={sp.x + pw * 0.25} y={sp.y + ph * 0.14} width={pw * 0.5} height={ph * 0.18}
                          fill="rgba(106,158,200,0.3)" stroke="#6A9EC8" strokeWidth={0.8} rx={1} />
                        {/* Door latch — small circle on left */}
                        <circle cx={sp.x + pw * 0.14} cy={cy} r={Math.min(pw, ph) * 0.06}
                          fill="none" stroke="#6A9EC8" strokeWidth={1} />
                        {/* Hazard triangle */}
                        {(() => {
                          const tx = cx, ty = sp.y + ph * 0.55, tr = Math.min(pw, ph) * 0.26
                          const t1x = tx, t1y = ty - tr
                          const t2x = tx - tr * 0.87, t2y = ty + tr * 0.5
                          const t3x = tx + tr * 0.87, t3y = ty + tr * 0.5
                          return <>
                            <polygon points={`${t1x},${t1y} ${t2x},${t2y} ${t3x},${t3y}`}
                              fill="rgba(106,158,200,0.15)" stroke="#6A9EC8" strokeWidth={0.8} />
                            {/* Lightning bolt */}
                            <polyline points={`${tx + tr * 0.1},${ty - tr * 0.4} ${tx - tr * 0.1},${ty + tr * 0.05} ${tx + tr * 0.08},${ty + tr * 0.05} ${tx - tr * 0.1},${ty + tr * 0.4}`}
                              fill="none" stroke="#6A9EC8" strokeWidth={0.9} strokeLinejoin="round" />
                          </>
                        })()}
                      </g>
                    )}
                    {fx.type === 'drain' && (
                      <g style={{ pointerEvents: 'none' }}>
                        {/* Circle with X — standard drain symbol */}
                        <circle cx={cx} cy={cy} r={Math.min(pw, ph) * 0.35}
                          fill="none" stroke="#50B4C8" strokeWidth={1.2} />
                        <line x1={cx - pw * 0.22} y1={cy - ph * 0.22} x2={cx + pw * 0.22} y2={cy + ph * 0.22}
                          stroke="#50B4C8" strokeWidth={1.2} />
                        <line x1={cx + pw * 0.22} y1={cy - ph * 0.22} x2={cx - pw * 0.22} y2={cy + ph * 0.22}
                          stroke="#50B4C8" strokeWidth={1.2} />
                      </g>
                    )}
                    <text x={cx} y={cy + 4} textAnchor="middle"
                      fontSize={Math.max(8, Math.min(11, Math.min(pw, ph) * 0.18))} fill="#C8A96E" fontWeight="700"
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 10, background: 'rgba(110,160,200,0.28)', border: '1px solid #6A9EC8' }} />
                <span style={{ fontSize: 10, color: '#6A6560' }}>Electrical</span>
              </div>
              <button
                onClick={() => router.push(`/room-setup/${designId}?from=floor-plan`)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#C8A96E', fontSize: 10, fontWeight: 600 }}
              >
                Edit room shape →
              </button>
            </div>
          </div>
        </div>

        {/* ── Fixture toolbar ── */}
        {(() => {
          const roomTypes = ROOM_FIXTURES[design?.room_type ?? ''] ?? ALL_TYPES
          const visibleTabs = PALETTE_TABS.filter(tab => tab.types.some(t => roomTypes.includes(t)))
          const activeTab = visibleTabs[Math.min(palTab, visibleTabs.length - 1)]
          const tabTypes = activeTab?.types.filter(t => roomTypes.includes(t)) ?? []
          return (
        <div style={{ background: '#1A1917', borderRadius: 12, border: '1px solid #2A2825', padding: 12, flexShrink: 0 }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 10, borderBottom: '1px solid #2A2825', overflowX: 'auto' }}>
            {visibleTabs.map((tab, i) => (
              <button key={tab.label} onClick={() => {
                const idx = Math.min(i, visibleTabs.length - 1)
                setPalTab(idx)
                const newTypes = PALETTE_TABS[PALETTE_TABS.indexOf(tab)].types.filter(t => roomTypes.includes(t))
                if (newTypes.length > 0) setAddType(newTypes[0])
              }} style={{
                flex: 1, padding: '7px 4px', border: 'none', background: 'none',
                borderBottom: `2px solid ${palTab === i ? '#C8A96E' : 'transparent'}`,
                color: palTab === i ? '#C8A96E' : '#6A6560',
                fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                letterSpacing: '0.3px', textTransform: 'uppercase', transition: 'color 0.15s',
              }}>
                {tab.label}
              </button>
            ))}
          </div>
          {/* Fixture buttons or SA window picker */}
          {activeTab?.label === 'Windows' ? (
            <div style={{ marginBottom: 10 }}>
              {/* Height row */}
              <div style={{ fontSize: 10, color: '#6A6560', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>Height</div>
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
                {SA_WIN_HEIGHTS.map(h => (
                  <button key={h.label} onClick={() => setWinHeight(h.mm)} style={{
                    flexShrink: 0, padding: '6px 8px', borderRadius: 8,
                    background: winHeight === h.mm ? 'rgba(200,169,110,0.18)' : '#242220',
                    border: `1px solid ${winHeight === h.mm ? '#C8A96E' : '#3A3835'}`,
                    color: winHeight === h.mm ? '#C8A96E' : '#6A6560',
                    fontSize: 10, fontWeight: 600,
                  }}>
                    <div>{h.label}</div>
                    <div style={{ fontSize: 9, opacity: 0.7 }}>{h.mm}mm</div>
                  </button>
                ))}
              </div>
              {/* Width row */}
              <div style={{ fontSize: 10, color: '#6A6560', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>Width</div>
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4 }}>
                {SA_WIN_WIDTHS.map(w => (
                  <button key={w} onClick={() => setWinWidth(w)} style={{
                    flexShrink: 0, padding: '6px 10px', borderRadius: 8,
                    background: winWidth === w ? 'rgba(200,169,110,0.18)' : '#242220',
                    border: `1px solid ${winWidth === w ? '#C8A96E' : '#3A3835'}`,
                    color: winWidth === w ? '#C8A96E' : '#6A6560',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {w}mm
                  </button>
                ))}
              </div>
            </div>
          ) : (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {tabTypes.map(t => (
              <button key={t} onClick={() => setAddType(t)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 8,
                background: addType === t ? 'rgba(200,169,110,0.18)' : '#242220',
                border: `1px solid ${addType === t ? '#C8A96E' : '#3A3835'}`,
                color: addType === t ? '#C8A96E' : '#6A6560',
                fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
              }}>
                {LBL[t]}
              </button>
            ))}
          </div>
          )}
          {/* Rotation / mirror row — always rendered to avoid layout shift */}
          {(() => {
            const selFx = fixes.find(f => f.iid === sel)
            const rot = selFx?.rotation ?? 0
            const isDoor = selFx?.type === 'door'
            const mirrored = selFx?.mirrored ?? false
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, visibility: sel ? 'visible' : 'hidden' }}>
                <button
                  onPointerDown={() => startRotHold(-5)}
                  onPointerUp={stopRotHold} onPointerLeave={stopRotHold} onPointerCancel={stopRotHold}
                  style={{
                    width: 36, height: 36, borderRadius: 8, border: '1px solid #3A3835',
                    background: '#242220', color: '#C8A96E', fontSize: 20, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>−</button>
                <div style={{
                  flex: 1, height: 36, borderRadius: 8, border: '1px solid #3A3835',
                  background: '#242220', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, color: '#F2EDE6',
                }}>{rot}°</div>
                <button
                  onPointerDown={() => startRotHold(5)}
                  onPointerUp={stopRotHold} onPointerLeave={stopRotHold} onPointerCancel={stopRotHold}
                  style={{
                    width: 36, height: 36, borderRadius: 8, border: '1px solid #3A3835',
                    background: '#242220', color: '#C8A96E', fontSize: 20, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>+</button>
                {/* Mirror — always reserve space, only interactive for doors */}
                <button onClick={mirrorSel} disabled={!isDoor} style={{
                  width: 36, height: 36, borderRadius: 8,
                  border: `1px solid ${isDoor && mirrored ? '#C8A96E' : '#3A3835'}`,
                  background: isDoor && mirrored ? 'rgba(200,169,110,0.18)' : '#242220',
                  color: isDoor ? '#C8A96E' : '#3A3835',
                  fontSize: 16, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  opacity: isDoor ? 1 : 0.3,
                }}>↔</button>
              </div>
            )
          })()}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addFixture} style={{
              flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#C8A96E,#A07840)',
              color: '#0F0F0E', fontSize: 13, fontWeight: 700,
            }}>
              + Place {addType === 'window' ? `Window ${winWidth}×${winHeight}mm` : LBL[addType]}
            </button>
            {/* Trash — always rendered to avoid layout shift */}
            <button onClick={removeSel} style={{
              padding: '11px 14px', borderRadius: 10,
              background: 'rgba(224,92,92,0.15)', border: '1px solid rgba(224,92,92,0.3)',
              color: '#E05C5C',
              visibility: sel ? 'visible' : 'hidden',
            }}>
              <TrashIcon />
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#6A6560', marginTop: 8, textAlign: 'center', visibility: sel ? 'visible' : 'hidden' }}>
            Hold to drag · tap trash to remove
          </p>
        </div>
          )
        })()}
      </div>

      <BottomNav designId={designId} />
    </div>
  )
}
