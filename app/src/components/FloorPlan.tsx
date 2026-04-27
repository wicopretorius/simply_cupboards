'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readItem, readItems, createItem, updateItem, deleteItem } from '@directus/sdk'
import type { Design, FloorFixture, PaletteItem } from '@/lib/types'
import { StatusBar, BottomNav, AppHeader, Spinner, TrashIcon } from './SharedUI'

const DEPTH_MM      = 3000
const CAB_BASE_D    = 600
const CAB_UPPER_D   = 300
const SVG_W         = 350

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

function toSvgPt(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint()
  pt.x = clientX; pt.y = clientY
  return pt.matrixTransform(svg.getScreenCTM()!.inverse())
}

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

  const wallMm = design?.wall_mm ?? 4200
  const SC     = SVG_W / wallMm
  const SVG_H  = Math.round(DEPTH_MM * SC)

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
      x: Math.max(0, (wallMm - fw) / 2),
      y: Math.max(0, (DEPTH_MM - fh) / 2),
    }
    setFixes(p => [...p, fix])
    setSel(fix.iid)
    setSaving(true)
    directus.request(createItem('floor_fixtures', { design_id: designId, type: addType, x: fix.x, y: fix.y }))
      .then(r => setFixes(p => p.map(f => f.iid === fix.iid ? { ...f, dbId: (r as FloorFixture).id } : f)))
      .finally(() => setSaving(false))
  }, [addType, designId, wallMm])

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
    let moved = false

    const onMove = (ev: PointerEvent) => {
      const cp  = toSvgPt(svg, ev.clientX, ev.clientY)
      const dmx = (cp.x - sp.x) / SC
      const dmy = (cp.y - sp.y) / SC
      if (!moved && Math.hypot(dmx, dmy) < 5) return
      moved = true
      const nx = Math.max(0, Math.min(wallMm - fw, fx0.x + dmx))
      const ny = Math.max(0, Math.min(DEPTH_MM - fh, fx0.y + dmy))
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
  }, [SC, wallMm])

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <><StatusBar /><Spinner /><BottomNav designId={designId} /></>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <StatusBar />
      <AppHeader
        title={design?.name ?? 'Floor Plan'}
        subtitle={`${(wallMm / 1000).toFixed(1)}m × ${(DEPTH_MM / 1000).toFixed(1)}m`}
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
            width={SVG_W}
            height={SVG_H}
            style={{ display: 'block', width: '100%', height: 'auto' }}
            onClick={() => setSel(null)}
          >
            {/* room fill */}
            <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#0F0F0E" />

            {/* upper cabinets – top wall, dashed */}
            {(() => {
              let cx = 0
              return uppers.map((wm, i) => {
                const px = cx * SC, pw = wm * SC, ph = CAB_UPPER_D * SC
                cx += wm
                return <rect key={i} x={px} y={0} width={pw} height={ph}
                  fill="rgba(42,40,37,0.9)" stroke="#3A3835" strokeWidth={1} strokeDasharray="4 2" />
              })
            })()}

            {/* base cabinets – bottom wall */}
            {(() => {
              let cx = 0
              return bases.map((wm, i) => {
                const px = cx * SC, pw = wm * SC, ph = CAB_BASE_D * SC
                cx += wm
                return <rect key={i} x={px} y={SVG_H - ph} width={pw} height={ph}
                  fill="#2A2825" stroke="#3A3835" strokeWidth={1} />
              })
            })()}

            {/* room outline */}
            <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="none" stroke="#5A5550" strokeWidth={2} />

            {/* dimension labels */}
            <text x={SVG_W / 2} y={14} textAnchor="middle" fontSize={9} fill="#4A4845">
              {(wallMm / 1000).toFixed(1)}m
            </text>
            <text x={SVG_W - 6} y={SVG_H / 2} textAnchor="middle" fontSize={9} fill="#4A4845"
              transform={`rotate(-90,${SVG_W - 6},${SVG_H / 2})`}>
              {(DEPTH_MM / 1000).toFixed(1)}m
            </text>

            {/* fixtures */}
            {fixes.map(fx => {
              const [fw, fh] = SZ[fx.type]
              const px = fx.x * SC, py = fx.y * SC
              const pw = fw * SC, ph = fh * SC
              const isSelected = sel === fx.iid
              return (
                <g key={fx.iid}>
                  <rect
                    x={px} y={py} width={pw} height={ph}
                    fill={CLR[fx.type]} rx={3}
                    stroke={isSelected ? '#F2EDE6' : 'transparent'}
                    strokeWidth={isSelected ? 1.5 : 0}
                    style={{ cursor: 'grab', touchAction: 'none' }}
                    onPointerDown={e => handlePointerDown(e, fx.iid)}
                  />
                  {/* fixture detail marks */}
                  {fx.type === 'stove' && [0, 1, 2, 3].map(i => (
                    <circle key={i}
                      cx={px + (i % 2 === 0 ? 0.28 : 0.72) * pw}
                      cy={py + (i < 2 ? 0.3 : 0.7) * ph}
                      r={Math.min(pw, ph) * 0.11}
                      fill="rgba(0,0,0,0.25)"
                      style={{ pointerEvents: 'none' }}
                    />
                  ))}
                  {fx.type === 'basin' && (
                    <ellipse cx={px + pw / 2} cy={py + ph / 2} rx={pw * 0.35} ry={ph * 0.3}
                      fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1}
                      style={{ pointerEvents: 'none' }} />
                  )}
                  {fx.type === 'door' && (
                    <path
                      d={`M ${px + pw * 0.05} ${py + ph * 0.95} A ${pw * 0.85} ${ph * 0.85} 0 0 1 ${px + pw * 0.95} ${py + ph * 0.05}`}
                      fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1}
                      style={{ pointerEvents: 'none' }} />
                  )}
                  {fx.type === 'window' && (
                    <line x1={px + pw * 0.1} y1={py + ph / 2} x2={px + pw * 0.9} y2={py + ph / 2}
                      stroke="rgba(0,0,0,0.3)" strokeWidth={1.5}
                      style={{ pointerEvents: 'none' }} />
                  )}
                  <text x={px + pw / 2} y={py + ph / 2 + 4} textAnchor="middle"
                    fontSize={Math.max(8, Math.min(11, ph * 0.18))} fill="#0F0F0E" fontWeight="600"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {LBL[fx.type]}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* legend */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #2A2825', display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 16, height: 10, background: '#2A2825', border: '1px solid #3A3835' }} />
              <span style={{ fontSize: 10, color: '#6A6560' }}>Base</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 16, height: 10, background: 'rgba(42,40,37,0.9)', border: '1px dashed #3A3835' }} />
              <span style={{ fontSize: 10, color: '#6A6560' }}>Upper (overhead)</span>
            </div>
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
