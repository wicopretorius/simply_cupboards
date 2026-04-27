'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readItem, updateItem } from '@directus/sdk'
import type { CSSProperties } from 'react'
import type { WallDef, RoomDef, Design } from '@/lib/types'
import { StatusBar, AppHeader } from './SharedUI'

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

const QUICK_LENGTHS = [600, 900, 1200, 1800, 2400, 3000, 3600, 4200]
const QUICK_ANGLES  = [0, 45, 90, 135, 180, 270]

// ── Component ────────────────────────────────────────────────────────────────

export default function RoomBuilder({ designId }: { designId: number }) {
  const router = useRouter()

  const [designName, setDesignName] = useState('New Design')
  const [walls, setWalls]   = useState<WallDef[]>([{ id: uid(), lengthMm: 4200, angleDeg: 0 }])
  const [selId, setSelId]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    directus.request(readItem('designs', designId, { fields: ['name'] }))
      .then(d => setDesignName((d as Design).name))
      .catch(() => {})
  }, [designId])

  const rawVerts = useMemo(() => computeVerts(walls), [walls])
  const fpt      = useMemo(() => fitVerts(rawVerts), [rawVerts])

  const selWall = walls.find(w => w.id === selId) ?? null
  const selIdx  = walls.findIndex(w => w.id === selId)

  // ── Mutations ──────────────────────────────────────────────────────────────

  const upd = useCallback((id: string, patch: Partial<WallDef>) => {
    setWalls(p => p.map(w => w.id === id ? { ...w, ...patch } : w))
  }, [])

  const addAtEnd = useCallback(() => {
    const last = walls[walls.length - 1]
    const nw: WallDef = { id: uid(), lengthMm: 2400, angleDeg: (last.angleDeg + 90) % 360 }
    setWalls(p => [...p, nw])
    setSelId(nw.id)
  }, [walls])

  const addAtStart = useCallback(() => {
    const first = walls[0]
    const nw: WallDef = { id: uid(), lengthMm: 2400, angleDeg: (first.angleDeg + 90) % 360 }
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
      const roomDef: RoomDef = { walls }
      await directus.request(updateItem('designs', designId, {
        room_shape: roomDef as any,
        wall_mm: walls[0].lengthMm,
        subtitle: `${walls.length} wall${walls.length !== 1 ? 's' : ''} · ${(walls[0].lengthMm / 1000).toFixed(1)}m`,
        badge: 'In Progress',
      }))
      router.push(`/wall-view/${designId}`)
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
      <StatusBar />
      <AppHeader
        title={designName}
        subtitle="Tap + to add walls · tap a wall to edit"
        onBack={() => router.push('/discover')}
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
            {walls.map((w, i) => {
              const p1 = fpt[i], p2 = fpt[i + 1]
              const isSel = w.id === selId
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
                    stroke={isSel ? '#C8A96E' : '#5A5550'}
                    strokeWidth={isSel ? 3 : 2}
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
                  {/* Angle label on selected wall */}
                  {isSel && (
                    <g transform={`translate(${mx},${my + (flip ? -14 : 14)}) rotate(${flip ? ang + 180 : ang})`}>
                      <text textAnchor="middle" y={4} fontSize={8} fill="#9A9590">
                        {w.angleDeg}°
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Interior vertices (not start/end) */}
            {fpt.slice(1, -1).map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r={4} fill="#3A3835" stroke="#5A5550" strokeWidth={1} />
            ))}

            {/* Start vertex */}
            <circle cx={startPt.x} cy={startPt.y} r={5} fill="#C8A96E" />

            {/* End vertex */}
            <circle cx={endPt.x} cy={endPt.y} r={4} fill="#3A3835" stroke="#5A5550" strokeWidth={1} />

            {/* + at end */}
            <g onClick={e => { e.stopPropagation(); addAtEnd() }} style={{ cursor: 'pointer' }}>
              <circle cx={endPlus.x} cy={endPlus.y} r={13} fill="#1A1917" stroke="#C8A96E" strokeWidth={1.5} />
              <text x={endPlus.x} y={endPlus.y + 6} textAnchor="middle" fontSize={20} fill="#C8A96E" style={{ userSelect: 'none' }}>+</text>
            </g>

            {/* + at start (only when not close to end) */}
            {endsDist > 40 && (
              <g onClick={e => { e.stopPropagation(); addAtStart() }} style={{ cursor: 'pointer' }}>
                <circle cx={startPlus.x} cy={startPlus.y} r={13} fill="#1A1917" stroke="#C8A96E" strokeWidth={1.5} />
                <text x={startPlus.x} y={startPlus.y + 6} textAnchor="middle" fontSize={20} fill="#C8A96E" style={{ userSelect: 'none' }}>+</text>
              </g>
            )}
          </svg>

          {/* Legend */}
          <div style={{ padding: '6px 14px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#C8A96E' }} />
              <span style={{ fontSize: 10, color: '#6A6560' }}>Start</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="20" height="6"><line x1={0} y1={3} x2={20} y2={3} stroke="#2A2825" strokeWidth={2} strokeDasharray="4 3" /></svg>
              <span style={{ fontSize: 10, color: '#6A6560' }}>Closing wall</span>
            </div>
            <div style={{ fontSize: 10, color: '#4A4845', marginLeft: 'auto' }}>
              {walls.length} wall{walls.length !== 1 ? 's' : ''}
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
                Wall {selIdx + 1}
              </span>
              {walls.length > 1 && (
                <button onClick={() => removeWall(selWall.id)} style={{
                  background: 'none', border: 'none', color: '#E05C5C', fontSize: 11, fontWeight: 600,
                }}>
                  Remove
                </button>
              )}
            </div>

            {/* Length */}
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Length (mm)</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => upd(selWall.id, { lengthMm: Math.max(100, selWall.lengthMm - 100) })} style={stepBtn}>−100</button>
                <input
                  type="number" inputMode="numeric"
                  value={selWall.lengthMm}
                  onChange={e => upd(selWall.id, { lengthMm: Math.max(100, Number(e.target.value) || 100) })}
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

            {/* Angle */}
            <div>
              <div style={labelStyle}>Angle from horizontal (°)</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => upd(selWall.id, { angleDeg: ((selWall.angleDeg - 15) + 360) % 360 })} style={stepBtn}>−15°</button>
                <input
                  type="number" inputMode="numeric"
                  value={selWall.angleDeg}
                  onChange={e => upd(selWall.id, { angleDeg: ((Number(e.target.value) % 360) + 360) % 360 })}
                  style={numInput}
                />
                <button onClick={() => upd(selWall.id, { angleDeg: (selWall.angleDeg + 15) % 360 })} style={stepBtn}>+15°</button>
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                {QUICK_ANGLES.map(v => (
                  <button key={v} onClick={() => upd(selWall.id, { angleDeg: v })} style={{
                    ...chip,
                    background: selWall.angleDeg === v ? 'rgba(200,169,110,0.15)' : '#242220',
                    color: selWall.angleDeg === v ? '#C8A96E' : '#6A6560',
                    border: `1px solid ${selWall.angleDeg === v ? '#C8A96E' : '#3A3835'}`,
                  }}>
                    {v}°
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: '#3A3835', marginTop: 6 }}>
                0° = right · 90° = up · 180° = left · 270° = down
              </div>
            </div>
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
          {walls.map((w, i) => (
            <button key={w.id} onClick={() => setSelId(selId === w.id ? null : w.id)} style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
              background: selId === w.id ? 'rgba(200,169,110,0.15)' : '#1A1917',
              border: `1px solid ${selId === w.id ? '#C8A96E' : '#2A2825'}`,
              color: selId === w.id ? '#C8A96E' : '#6A6560',
            }}>
              W{i + 1} · {w.lengthMm}mm · {w.angleDeg}°
            </button>
          ))}
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
