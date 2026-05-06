'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readItem, updateItem } from '@directus/sdk'
import type { CSSProperties } from 'react'
import type { WallDef, RoomDef, Design } from '@/lib/types'
import { AppHeader } from './SharedUI'

const SVG_W = 340
const SVG_H = 230
const PAD   = 40

const uid = () => Math.random().toString(36).slice(2, 7)

// ── Geometry helpers ─────────────────────────────────────────────────────────

function computeVerts(walls: WallDef[]) {
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  for (const w of walls) {
    const prev = pts[pts.length - 1]
    const rad  = (w.angleDeg * Math.PI) / 180
    // angleDeg: 0=right, 90=up (SVG y flipped so subtract)
    pts.push({ x: prev.x + w.lengthMm * Math.cos(rad), y: prev.y - w.lengthMm * Math.sin(rad) })
  }
  return pts
}

function fitVerts(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return pts.map(() => ({ x: SVG_W / 2, y: SVG_H / 2 }))
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 2000
  const rangeY = maxY - minY || 2000
  const scale = Math.min((SVG_W - PAD * 2) / rangeX, (SVG_H - PAD * 2) / rangeY)
  const ox = PAD + ((SVG_W - PAD * 2) - rangeX * scale) / 2
  const oy = PAD + ((SVG_H - PAD * 2) - rangeY * scale) / 2
  return pts.map(p => ({
    x: ox + (p.x - minX) * scale,
    y: oy + (p.y - minY) * scale,
  }))
}

const QUICK_LENGTHS = [300, 600, 900, 1200, 1800, 2400, 3000, 3600, 4200]
const QUICK_ANGLES  = [0, 45, 90, 135, 180, 270]

// Relative angle: how many degrees you turn clockwise from the previous wall.
// 90° = turn right, 0° = go straight, 180° = U-turn.
// Wall 0 has no previous wall — we treat its absolute angle as the reference (always 0°).
function getRelAngle(walls: WallDef[], idx: number): number {
  if (idx === 0) return 0  // first wall is the reference
  const prevAbs = walls[idx - 1].angleDeg
  const currAbs = walls[idx].angleDeg
  return (prevAbs - currAbs + 360) % 360
}

function relToAbsolute(walls: WallDef[], idx: number, relAngle: number): number {
  if (idx === 0) return walls[0].angleDeg  // first wall angle is fixed reference
  const prevAbs = walls[idx - 1].angleDeg
  return (prevAbs - relAngle + 360) % 360
}

// ── Component ────────────────────────────────────────────────────────────────

export default function RoomBuilder({ designId, returnTo = 'wall-view' }: { designId: number; returnTo?: string }) {
  const router = useRouter()

  const [designName, setDesignName] = useState('New Design')
  const [walls, setWalls]       = useState<WallDef[]>([{ id: uid(), lengthMm: 4200, angleDeg: 0 }])
  const [selId, setSelId]       = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [isClosed, setIsClosed] = useState(false)
  const [heightMm, setHeightMm] = useState(2400)
  const [heightStr, setHeightStr] = useState('2400')

  const setHeight = (mm: number) => { setHeightMm(mm); setHeightStr(String(mm)) }

  useEffect(() => {
    const load = async () => {
      try {
        const d = await directus.request(readItem('designs', designId, { fields: ['*'] as any }))
        const des = d as unknown as Design
        setDesignName(des.name)
        if (des.wall_height_mm) setHeight(des.wall_height_mm)
        const shape = (des as any).room_shape
        if (shape?.walls?.length > 0) setWalls(shape.walls)
      } catch {}
    }
    load()
  }, [designId])

  const rawVerts = useMemo(() => computeVerts(walls), [walls])
  
  // If closed, we add one more wall back to (0,0)
  const displayWalls = useMemo(() => {
    if (!isClosed) return walls
    const lastPt = rawVerts[rawVerts.length - 1]
    const dx = 0 - lastPt.x, dy = 0 - lastPt.y
    const len = Math.hypot(dx, dy)
    if (len < 50) return walls // already closed or too close
    const ang = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360
    return [...walls, { id: 'closing-wall', lengthMm: Math.round(len), angleDeg: ang }]
  }, [walls, isClosed, rawVerts])

  const fpt = useMemo(() => fitVerts(computeVerts(displayWalls)), [displayWalls])

  const selWall = displayWalls.find(w => w.id === selId) ?? null
  const selIdx  = displayWalls.findIndex(w => w.id === selId)

  // ── Mutations ──────────────────────────────────────────────────────────────

  const upd = useCallback((id: string, patch: Partial<WallDef>) => {
    setWalls(p => p.map(w => w.id === id ? { ...w, ...patch } : w))
  }, [])

  const addAtEnd = useCallback(() => {
    const last = walls[walls.length - 1]
    const nw: WallDef = { id: uid(), lengthMm: 2400, angleDeg: (last.angleDeg - 90 + 360) % 360 }
    setWalls(p => [...p, nw])
    setSelId(nw.id)
  }, [walls])

  const addAtStart = useCallback(() => {
    const first = walls[0]
    const nw: WallDef = { id: uid(), lengthMm: 2400, angleDeg: (first.angleDeg - 90 + 360) % 360 }
    setWalls(p => [nw, ...p])
    setSelId(nw.id)
  }, [walls])

  const removeWall = useCallback((id: string) => {
    if (walls.length <= 1) return
    const idx = walls.findIndex(w => w.id === id)
    setWalls(p => p.filter(w => w.id !== id))
    setSelId(walls[idx > 0 ? idx - 1 : 0]?.id ?? null)
  }, [walls])

  const handleDone = async () => {
    setSaving(true)
    try {
      const finalWalls = isClosed ? displayWalls : walls
      const roomDef: RoomDef = { walls: finalWalls }
      await directus.request(updateItem('designs', designId, {
        room_shape: roomDef as any,
        wall_mm: finalWalls[0].lengthMm,
        wall_height_mm: heightMm,
        subtitle: `${finalWalls.length} wall${finalWalls.length !== 1 ? 's' : ''} · ${(finalWalls[0].lengthMm / 1000).toFixed(1)}m · ${(heightMm / 1000).toFixed(1)}m H`,
        badge: 'In Progress',
      }))
      router.push(`/${returnTo}/${designId}`)
    } finally {
      setSaving(false)
    }
  }

  // ── SVG helpers ────────────────────────────────────────────────────────────

  const startPt   = fpt[0]
  const endPt     = fpt[fpt.length - 1]
  const endsDist  = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y)

  // Push "+" circle 22px beyond each endpoint along the last/first wall direction
  function pushPt(pt: { x: number; y: number }, toward: { x: number; y: number }) {
    const dx = pt.x - toward.x, dy = pt.y - toward.y
    const len = Math.hypot(dx, dy) || 1
    return { x: pt.x + (dx / len) * 22, y: pt.y + (dy / len) * 22 }
  }
  const endPlus   = pushPt(endPt, fpt[fpt.length - 2] ?? startPt)
  const startPlus = pushPt(startPt, fpt[1] ?? endPt)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      <AppHeader
        title={designName}
        subtitle="Tap + to add walls · tap a wall to edit"
        onBack={() => router.push('/designs')}
        actions={
          <button onClick={handleDone} disabled={saving} style={{
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: saving ? '#5A4A30' : 'linear-gradient(135deg,#C8A96E,#A07840)',
            color: '#0F0F0E', fontSize: 12, fontWeight: 700,
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving…' : 'Done →'}
          </button>
        }
      />

      {/* SVG canvas */}
      <div style={{ padding: '12px 20px 8px', flexShrink: 0 }}>
        <div style={{ background: '#1A1917', borderRadius: 12, border: '1px solid #2A2825' }}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
          >
            {/* Closing wall (dashed) */}
            <line
              x1={endPt.x} y1={endPt.y} x2={startPt.x} y2={startPt.y}
              stroke="#2A2825" strokeWidth={1.5} strokeDasharray="6 4"
            />

            {/* Walls */}
            {displayWalls.map((w, i) => {
              const p1 = fpt[i], p2 = fpt[i + 1]
              const isSel = w.id === selId
              const isClosing = w.id === 'closing-wall'
              const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2
              const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI
              const flip = ang > 90 || ang < -90

              return (
                <g key={w.id} onClick={() => setSelId(isSel ? null : w.id)} style={{ cursor: 'pointer' }}>
                  {/* Wide transparent hit area */}
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={20} />
                  {/* Visible wall */}
                  <line
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    stroke={isSel ? '#C8A96E' : (isClosing ? '#2A2825' : '#5A5550')}
                    strokeWidth={isSel ? 3 : 2}
                    strokeDasharray={isClosing && !isSel ? '6 4' : 'none'}
                    strokeLinecap="round"
                  />
                  {/* Length label */}
                  <g transform={`translate(${mx},${my}) rotate(${flip ? ang + 180 : ang})`}>
                    <rect x={-26} y={-9} width={52} height={16} rx={4} fill="#1A1917" />
                    <text textAnchor="middle" y={4} fontSize={9}
                      fill={isSel ? '#C8A96E' : '#6A6560'} fontWeight="600">
                      {w.lengthMm}mm
                    </text>
                  </g>
                </g>
              )
            })}

            {/* Angle labels at corners (only for selected wall's junction or all junctions?) 
                User said "the angles", implying maybe all or at least better placement. 
                Let's show the angle at the corner of the selected wall. */}
            {displayWalls.map((w, i) => {
              if (i === 0) return null
              const isSel = w.id === selId
              if (!isSel) return null
              
              const pt = fpt[i]
              const p1 = fpt[i-1]
              const p2 = fpt[i]
              const p3 = fpt[i+1]
              
              // Calculate vectors from vertex p2
              const ang1 = Math.atan2(p1.y - p2.y, p1.x - p2.x)
              const ang2 = Math.atan2(p3.y - p2.y, p3.x - p2.x)
              
              // turnAngle is the interior angle we want to show
              // getRelAngle(displayWalls, i) returns the "turn" amount.
              // For a right-angle corner, turn is 90, interior is 90.
              // For a 45 deg outward turn, turn is 315, interior is 135.
              
              // To find the interior midpoint, we average the absolute angles
              // but ensure we pick the side that is "inside".
              // Standard: ang1 is back along prev wall, ang2 is forward along curr wall.
              let diff = ang2 - ang1
              while (diff < -Math.PI) diff += Math.PI * 2
              while (diff > Math.PI) diff -= Math.PI * 2
              
              // midAng is the direction for the label
              const midAng = ang1 + diff / 2
              const dist = 30
              const lx = pt.x + Math.cos(midAng) * dist
              const ly = pt.y + Math.sin(midAng) * dist

              // Draw arc between walls
              const r = 18
              const x1 = pt.x + Math.cos(ang1) * r
              const y1 = pt.y + Math.sin(ang1) * r
              const x2 = pt.x + Math.cos(ang2) * r
              const y2 = pt.y + Math.sin(ang2) * r
              
              const sweep = diff > 0 ? 1 : 0
              const largeArc = Math.abs(diff) > Math.PI ? 1 : 0

              return (
                <g key={`ang-${w.id}`}>
                  <path
                    d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`}
                    fill="rgba(200,169,110,0.1)" stroke="#C8A96E" strokeWidth={1.5}
                  />
                  <g transform={`translate(${lx},${ly})`}>
                    <rect x={-15} y={-7} width={30} height={14} rx={4} fill="#0F0F0E" stroke="#3A3835" strokeWidth={0.5} />
                    <text textAnchor="middle" y={3} fontSize={8} fill="#C8A96E" fontWeight="700">
                      {Math.round(Math.abs(diff) * 180 / Math.PI)}°
                    </text>
                  </g>
                </g>
              )
            })}

            {/* Interior vertices (not start/end) */}
            {fpt.slice(1, -1).map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r={4} fill="#3A3835" stroke="#5A5550" strokeWidth={1} />
            ))}

            {/* Origin marker */}
            <circle cx={startPt.x} cy={startPt.y} r={7} fill="#1A1917" stroke="#C8A96E" strokeWidth={2} />
            <circle cx={startPt.x} cy={startPt.y} r={3} fill="#C8A96E" />

            {/* End vertex */}
            <circle cx={endPt.x} cy={endPt.y} r={4} fill="#3A3835" stroke="#5A5550" strokeWidth={1} />

            {/* + at end */}
            {!isClosed && (
              <g onClick={e => { e.stopPropagation(); addAtEnd() }} style={{ cursor: 'pointer' }}>
                <circle cx={endPlus.x} cy={endPlus.y} r={13} fill="#1A1917" stroke="#C8A96E" strokeWidth={1.5} />
                <text x={endPlus.x} y={endPlus.y + 6} textAnchor="middle" fontSize={20} fill="#C8A96E" style={{ userSelect: 'none' }}>+</text>
              </g>
            )}
          </svg>

          {/* Legend */}
          <div style={{ padding: '6px 14px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#C8A96E' }} />
              <span style={{ fontSize: 10, color: '#6A6560' }}>Origin</span>
            </div>
            
            <button
              onClick={() => setIsClosed(!isClosed)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: isClosed ? 'rgba(200,169,110,0.15)' : 'none',
                border: isClosed ? '1px solid #C8A96E' : '1px solid #2A2825',
                padding: '4px 10px', borderRadius: 20,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <svg width="20" height="6"><line x1={0} y1={3} x2={20} y2={3} stroke={isClosed ? "#C8A96E" : "#2A2825"} strokeWidth={2} strokeDasharray="4 3" /></svg>
              <span style={{ fontSize: 10, color: isClosed ? '#C8A96E' : '#6A6560', fontWeight: 600 }}>
                {isClosed ? 'Room Closed' : 'Close Room'}
              </span>
            </button>

            <div style={{ fontSize: 10, color: '#4A4845', marginLeft: 'auto' }}>
              {displayWalls.length} wall{displayWalls.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Wall editor */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {selWall ? (
          <div style={{ background: '#1A1917', border: '1px solid #C8A96E', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#C8A96E' }}>
                {selWall.id === 'closing-wall' ? 'Closing Wall' : `Wall ${selIdx + 1}`}
              </span>
              {selWall.id !== 'closing-wall' && walls.length > 1 && (
                <button onClick={() => removeWall(selWall.id)} style={{
                  background: 'none', border: 'none', color: '#E05C5C', fontSize: 11, fontWeight: 600,
                }}>
                  Remove
                </button>
              )}
            </div>

            {/* Length */}
            {selWall.id === 'closing-wall' ? (
              <div style={{ fontSize: 11, color: '#6A6560', padding: '10px 0' }}>
                This wall is calculated automatically to close the room. Adjust other walls to change its length.
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Length (mm)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => upd(selWall.id, { lengthMm: Math.max(1, selWall.lengthMm - 100) })} style={stepBtn}>−100</button>
                  <input
                    type="number" inputMode="numeric"
                    value={selWall.lengthMm || ''}
                    onChange={e => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value)
                      upd(selWall.id, { lengthMm: val })
                    }}
                    onBlur={() => {
                      if (selWall.lengthMm < 1) upd(selWall.id, { lengthMm: 1 })
                    }}
                    style={numInput}
                  />
                  <button onClick={() => upd(selWall.id, { lengthMm: selWall.lengthMm + 100 })} style={stepBtn}>+100</button>
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                  {QUICK_LENGTHS.map(v => (
                    <button key={v} onClick={() => upd(selWall.id, { lengthMm: v })} style={{
                      ...chip,
                      background: selWall.lengthMm === v ? 'rgba(200,169,110,0.15)' : '#242220',
                      color: selWall.lengthMm === v ? '#C8A96E' : '#6A6560',
                      border: `1px solid ${selWall.lengthMm === v ? '#C8A96E' : '#3A3835'}`,
                    }}>
                      {v < 1000 ? `${v}` : `${v / 1000}m`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Angle */}
            {selIdx === 0 ? (
              <div>
                <div style={labelStyle}>Starting direction (absolute °)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => upd(selWall.id, { angleDeg: (selWall.angleDeg - 5 + 360) % 360 })} style={stepBtn}>−5°</button>
                  <input
                    type="number" inputMode="numeric"
                    value={selWall.angleDeg}
                    onChange={e => {
                      const v = ((Number(e.target.value) % 360) + 360) % 360
                      upd(selWall.id, { angleDeg: v })
                    }}
                    style={numInput}
                  />
                  <button onClick={() => upd(selWall.id, { angleDeg: (selWall.angleDeg + 5) % 360 })} style={stepBtn}>+5°</button>
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                  {[0, 45, 90, 135, 180, 270].map(v => (
                    <button key={v} onClick={() => upd(selWall.id, { angleDeg: v })} style={{
                      ...chip,
                      background: selWall.angleDeg === v ? 'rgba(200,169,110,0.15)' : '#242220',
                      color: selWall.angleDeg === v ? '#C8A96E' : '#6A6560',
                      border: `1px solid ${selWall.angleDeg === v ? '#C8A96E' : '#3A3835'}`,
                    }}>{v}°</button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: '#3A3835', marginTop: 6 }}>
                  0° = right · 90° = up · 180° = left · 270° = down
                </div>
              </div>
            ) : selWall.id === 'closing-wall' ? (
              <div>
                <div style={labelStyle}>Turn from previous wall (°)</div>
                <div style={numInput}>
                  {Math.round(getRelAngle(displayWalls, selIdx))}°
                </div>
                <div style={{ fontSize: 11, color: '#6A6560', marginTop: 8 }}>
                  This angle is determined by the room shape.
                </div>
              </div>
            ) : (
              <div>
                <div style={labelStyle}>Turn from previous wall (°)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => {
                    const rel = (getRelAngle(displayWalls, selIdx) + 5) % 360
                    upd(selWall.id, { angleDeg: relToAbsolute(displayWalls, selIdx, rel) })
                  }} style={stepBtn}>−5°</button>
                  <input
                    type="number" inputMode="numeric"
                    value={Math.round(getRelAngle(displayWalls, selIdx)) || ''}
                    onChange={e => {
                      const rel = e.target.value === '' ? 0 : ((Number(e.target.value) % 360) + 360) % 360
                      upd(selWall.id, { angleDeg: relToAbsolute(displayWalls, selIdx, rel) })
                    }}
                    style={numInput}
                  />
                  <button onClick={() => {
                    const rel = (getRelAngle(displayWalls, selIdx) - 5 + 360) % 360
                    upd(selWall.id, { angleDeg: relToAbsolute(displayWalls, selIdx, rel) })
                  }} style={stepBtn}>+5°</button>
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                  {QUICK_ANGLES.map(v => {
                    const currRel = getRelAngle(displayWalls, selIdx)
                    return (
                      <button key={v} onClick={() => upd(selWall.id, { angleDeg: relToAbsolute(displayWalls, selIdx, v) })} style={{
                        ...chip,
                        background: Math.round(currRel) === v ? 'rgba(200,169,110,0.15)' : '#242220',
                        color: Math.round(currRel) === v ? '#C8A96E' : '#6A6560',
                        border: `1px solid ${Math.round(currRel) === v ? '#C8A96E' : '#3A3835'}`,
                      }}>
                        {v}°
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize: 10, color: '#3A3835', marginTop: 6 }}>
                  0° = straight · 90° = right turn · 180° = U-turn · 270° = left turn
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: '#1A1917', border: '1px solid #2A2825', borderRadius: 12,
            padding: '16px', textAlign: 'center', color: '#4A4845', fontSize: 13,
          }}>
            Tap a wall to edit its length and angle
          </div>
        )}

        {/* Wall chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {displayWalls.map((w, i) => (
            <button key={w.id} onClick={() => setSelId(selId === w.id ? null : w.id)} style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
              background: selId === w.id ? 'rgba(200,169,110,0.15)' : '#1A1917',
              border: `1px solid ${selId === w.id ? '#C8A96E' : '#2A2825'}`,
              color: selId === w.id ? '#C8A96E' : '#6A6560',
            }}>
              {w.id === 'closing-wall' ? 'CW' : `W${i + 1}`} · {w.lengthMm}mm · {i === 0 ? 'ref' : `${getRelAngle(displayWalls, i)}° turn`}
            </button>
          ))}
        </div>

        {/* Wall height */}
        <div style={{ background: '#1A1917', border: '1px solid #2A2825', borderRadius: 12, padding: 14 }}>
          <div style={labelStyle}>Ceiling height (mm)</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <button onClick={() => setHeight(Math.max(0, heightMm - 100))} style={stepBtn}>−100</button>
            <input
              type="number" inputMode="numeric"
              value={heightStr}
              onChange={e => setHeightStr(e.target.value)}
              onBlur={() => {
                const v = Math.max(0, Number(heightStr) || 0)
                setHeight(v)
              }}
              style={numInput}
            />
            <button onClick={() => setHeight(Math.min(3600, heightMm + 100))} style={stepBtn}>+100</button>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[2100, 2400, 2700, 3000, 3600].map(v => (
              <button key={v} onClick={() => setHeight(v)} style={{
                ...chip,
                background: heightMm === v ? 'rgba(200,169,110,0.15)' : '#242220',
                color: heightMm === v ? '#C8A96E' : '#6A6560',
                border: `1px solid ${heightMm === v ? '#C8A96E' : '#3A3835'}`,
              }}>
                {(v / 1000).toFixed(1)}m
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#3A3835', textAlign: 'center' }}>
          Tap + to extend the room · tap Done when finished
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: CSSProperties = {
  fontSize: 10, color: '#6A6560', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8,
}
const stepBtn: CSSProperties = {
  padding: '9px 8px', borderRadius: 8, flexShrink: 0, whiteSpace: 'nowrap',
  background: '#242220', border: '1px solid #3A3835',
  color: '#9A9590', fontSize: 10, fontWeight: 600,
}
const numInput: CSSProperties = {
  flex: 1, minWidth: 0, padding: '10px 8px', borderRadius: 8,
  background: '#0F0F0E', border: '1px solid #3A3835',
  color: '#F2EDE6', fontSize: 15, fontWeight: 600,
  textAlign: 'center', outline: 'none',
}
const chip: CSSProperties = {
  padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, flexShrink: 0,
}
