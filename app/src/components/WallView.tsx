'use client'
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readItem, readItems, createItem, updateItem, deleteItem } from '@directus/sdk'
import type { PaletteItem, Design, CabinetTab, FloorFixture } from '@/lib/types'
import {
  BottomNav, IconBtn,
  ChevronLeft, ChevronRight, DotsIcon, TrashIcon, ArrowLeftIcon, ArrowRightIcon,
} from './SharedUI'
import { ensureSession } from '@/lib/auth'

// ── Types ──────────────────────────────────────────────────────────────────
interface WallCabinet {
  dbId: number | null   // null = pending save
  instanceId: string
  item: PaletteItem
  row: 'base' | 'upper'
  sort: number
}

interface DragState {
  item: PaletteItem
  sourceInstanceId?: string
  startX: number; startY: number
  x: number; y: number
  active: boolean
}

let _uid = 0
const uid = () => `wc_${++_uid}`

// ── Sub-components ─────────────────────────────────────────────────────────
const CabinetFace = ({
  cabinet, isSelected, widthPx, rowH, isUpper, onSelect, onPointerDown,
}: {
  cabinet: WallCabinet; isSelected: boolean; widthPx: number; rowH: number
  isUpper: boolean; onSelect: () => void; onPointerDown: (e: React.PointerEvent) => void
}) => {
  const { item } = cabinet
  const handles = item.doors === 0 && !item.is_drawer && !item.is_appliance
    ? [50]
    : Array.from({ length: item.doors }, (_, d) => ((d + 0.5) / item.doors) * 100)

  return (
    <div
      onClick={e => { e.stopPropagation(); onSelect() }}
      onPointerDown={onPointerDown}
      title={`${item.label} ${item.sublabel}`}
      style={{
        width: widthPx, height: rowH, position: 'relative',
        background: isSelected
          ? 'linear-gradient(180deg,#3C3228,#302820)'
          : isUpper ? 'linear-gradient(180deg,#282420,#222018)' : 'linear-gradient(180deg,#2E2A25,#252220)',
        border: `1px solid ${isSelected ? '#C8A96E' : '#3A3530'}`,
        boxShadow: isSelected ? '0 0 0 1px rgba(200,169,110,0.35),inset 0 0 10px rgba(200,169,110,0.08)' : 'none',
        cursor: 'grab', flexShrink: 0, touchAction: 'none', userSelect: 'none',
        transition: 'border-color 0.15s,box-shadow 0.15s',
        overflow: 'hidden',
      }}
    >
      {item.doors >= 2 && Array.from({ length: item.doors - 1 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: 0, left: `${((i + 1) / item.doors) * 100}%`, width: 1, height: '100%', background: '#3A3530' }} />
      ))}
      {!!item.is_drawer && (
        <>
          <div style={{ position: 'absolute', top: '33%', left: 4, right: 4, height: 1, background: '#3A3530' }} />
          <div style={{ position: 'absolute', top: '66%', left: 4, right: 4, height: 1, background: '#3A3530' }} />
        </>
      )}
      {!!item.is_appliance && (
        <div style={{ position: 'absolute', inset: 4, background: 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(200,169,110,0.06) 4px,rgba(200,169,110,0.06) 5px)' }} />
      )}
      {handles.map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: `${pos}%`,
          transform: 'translate(-50%,-50%)',
          width: 2, height: !!item.is_drawer ? 8 : 13,
          background: !!item.is_appliance ? 'rgba(110,168,200,0.5)' : 'rgba(200,169,110,0.65)',
          borderRadius: 1,
        }} />
      ))}
      {isSelected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#C8A96E', boxShadow: '0 0 6px rgba(200,169,110,0.8)' }} />}
    </div>
  )
}

const DropIndicator = () => (
  <div style={{ width: 3, flexShrink: 0, alignSelf: 'stretch', background: '#C8A96E', boxShadow: '0 0 8px rgba(200,169,110,0.7)', borderRadius: 2, zIndex: 10 }} />
)

const DragGhost = ({ item, x, y }: { item: PaletteItem; x: number; y: number }) => (
  <div style={{ position: 'fixed', left: x - 30, top: y - 20, pointerEvents: 'none', zIndex: 9999, opacity: 0.85, transform: 'rotate(2deg) scale(1.05)' }}>
    <div style={{ width: 60, height: 40, background: 'linear-gradient(180deg,#3A3228,#2E2820)', border: '2px solid #C8A96E', borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.6),0 0 12px rgba(200,169,110,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#C8A96E' }}>{item.label}</div>
      <div style={{ fontSize: 8, color: '#6A6560' }}>{item.sublabel}</div>
    </div>
  </div>
)

const PaletteCard = ({ item, isSelected, onPointerDown }: {
  item: PaletteItem; isSelected: boolean; onPointerDown: (e: React.PointerEvent) => void
}) => (
  <button
    onPointerDown={onPointerDown}
    style={{
      background: isSelected ? 'rgba(200,169,110,0.12)' : '#242220',
      border: `1px solid ${isSelected ? '#C8A96E' : '#3A3835'}`, borderRadius: 10,
      padding: '8px 6px 6px', cursor: 'grab', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      touchAction: 'none', userSelect: 'none', width: '100%', boxSizing: 'border-box',
    }}
  >
    <div style={{ width: '100%', height: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: Math.min(42, 14 + item.doors * 10), height: 26, background: 'linear-gradient(180deg,#2E2A25,#252220)', border: `1px solid ${isSelected ? '#C8A96E' : '#3A3530'}`, position: 'relative', borderRadius: 1 }}>
        {item.doors >= 2 && <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: '#3A3530' }} />}
        {item.doors >= 3 && <div style={{ position: 'absolute', top: 0, left: '33%', width: 1, height: '100%', background: '#3A3530' }} />}
        {!!item.is_drawer && <div style={{ position: 'absolute', top: '45%', left: 0, right: 0, height: 1, background: '#3A3530' }} />}
      </div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: isSelected ? '#C8A96E' : '#9A9590', fontWeight: 600, lineHeight: 1.2 }}>{item.label}</div>
      <div style={{ fontSize: 8, color: '#5A5550', lineHeight: 1.2 }}>{item.sublabel}</div>
    </div>
  </button>
)

// ── Main component ─────────────────────────────────────────────────────────
export default function WallView({ designId }: { designId: number }) {
  const router = useRouter()
  const [design, setDesign]             = useState<Design | null>(null)
  const [cabinets, setCabinets]         = useState<WallCabinet[]>([])
  const [palette, setPalette]           = useState<Record<CabinetTab, PaletteItem[]>>({} as Record<CabinetTab, PaletteItem[]>)
  const [activeTab, setActiveTab]       = useState<CabinetTab>('Base Units')
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [dragState, setDragState]       = useState<DragState | null>(null)
  const [dropPreview, setDropPreview]   = useState<{ row: 'base' | 'upper'; index: number } | null>(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [wallPx, setWallPx]             = useState(342)
  const [wallHeightPx, setWallHeightPx] = useState(300)
  const [floorFixtures, setFloorFixtures] = useState<FloorFixture[]>([])
  const [selWinId, setSelWinId]         = useState<number | null>(null)

  const dragRef          = useRef<DragState | null>(null)
  const cabinetsRef      = useRef<WallCabinet[]>([])
  const floorFixRef      = useRef<FloorFixture[]>([])
  const winDragRef       = useRef<{ id: number; startClientX: number; startDistMm: number; perpDist: number } | null>(null)
  const baseRowRef       = useRef<HTMLDivElement>(null)
  const upperRowRef      = useRef<HTMLDivElement>(null)
  const wallContainerRef = useRef<HTMLDivElement>(null)
  const paletteScrollRef = useRef<HTMLDivElement>(null)
  const [scrollThumb, setScrollThumb] = useState({ left: 0, width: 0, visible: false })

  const updateThumb = useCallback(() => {
    const el = paletteScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    if (scrollWidth <= clientWidth) { setScrollThumb(t => ({ ...t, visible: false })); return }
    const ratio = clientWidth / scrollWidth
    setScrollThumb({
      visible: true,
      width: Math.max(32, ratio * clientWidth),
      left: (scrollLeft / (scrollWidth - clientWidth)) * (clientWidth - Math.max(32, ratio * clientWidth)),
    })
  }, [])

  useEffect(() => { cabinetsRef.current = cabinets }, [cabinets])
  useEffect(() => { floorFixRef.current = floorFixtures }, [floorFixtures])

  useEffect(() => {
    // Recompute thumb after tab switch or palette load (content width changes)
    const frame = requestAnimationFrame(updateThumb)
    return () => cancelAnimationFrame(frame)
  }, [activeTab, palette, updateThumb])

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!await ensureSession()) { router.replace('/login'); return }
      try {
        const [des, cabs, palItems, fxs] = await Promise.all([
          directus.request(readItem('designs', designId, { fields: ['*'] })),
          directus.request(readItems('placed_cabinets', {
            filter: { design_id: { _eq: designId } },
            fields: ['*', 'palette_item_id.*'] as any,
            sort: ['row', 'sort'],
          })),
          directus.request(readItems('palette_items', { sort: ['tab', 'width_mm'], limit: -1 })),
          directus.request(readItems('floor_fixtures', { filter: { design_id: { _eq: designId } } })),
        ])
        setDesign(des as Design)
        setFloorFixtures(fxs as FloorFixture[])

        // Map Directus records to WallCabinets
        const mapped: WallCabinet[] = (cabs as any[]).map(c => ({
          dbId: c.id,
          instanceId: uid(),
          item: c.palette_item_id as PaletteItem,
          row: c.row,
          sort: c.sort,
        }))
        setCabinets(mapped)

        // Group palette by tab
        const grouped = {} as Record<CabinetTab, PaletteItem[]>
        for (const item of palItems as PaletteItem[]) {
          if (!grouped[item.tab]) grouped[item.tab] = []
          grouped[item.tab].push(item)
        }
        setPalette(grouped)
      } catch {
        router.replace('/designs')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [designId, router])

  // ── Measure wall width ─────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const el = wallContainerRef.current
    if (!el) return
    const measure = () => { setWallPx(el.clientWidth); setWallHeightPx(el.clientHeight) }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  const wallMm       = design?.wall_mm ?? 4200
  const wallHeightMm = design?.wall_height_mm ?? 2400
  const baseCabs  = cabinets.filter(c => c.row === 'base').sort((a, b) => a.sort - b.sort)
  const upperCabs = cabinets.filter(c => c.row === 'upper').sort((a, b) => a.sort - b.sort)

  // ── Wall 1 geometry ────────────────────────────────────────────────────────
  const w1Angle  = ((design?.room_shape?.walls?.[0]?.angleDeg ?? 0) * Math.PI) / 180
  const w1DirX   =  Math.cos(w1Angle)
  const w1DirY   = -Math.sin(w1Angle)   // floor plan y increases downward
  const w1NormX  =  Math.sin(w1Angle)   // inward normal (into room)
  const w1NormY  =  Math.cos(w1Angle)

  // Windows that touch / are near Wall 1
  const WIN_THRESH = 350   // mm perpendicular snap distance

  const wallWindows = floorFixtures
    .filter(fx => fx.type === 'window')
    .map(fx => {
      const distAlong = fx.x * w1DirX + fx.y * w1DirY
      const perpDist  = fx.x * w1NormX + fx.y * w1NormY
      const wMm   = fx.width_mm  ?? 900
      const hMm   = fx.height_mm ?? 1200
      const sill  = fx.sill_height_mm ?? 900
      return { fx, distAlong, perpDist, wMm, hMm, sill }
    })
    .filter(w => w.perpDist >= 0 && w.perpDist < WIN_THRESH && w.distAlong >= 0 && w.distAlong <= wallMm)

  // Elevation scale: floor at (wallHeightPx - 22)px, ceiling at 8px
  const FLOOR_PX = 22
  const CEIL_PX  = 8
  const elevPx   = wallHeightPx - FLOOR_PX - CEIL_PX
  const mmToElev = (fromFloorMm: number) =>
    wallHeightPx - FLOOR_PX - (fromFloorMm / wallHeightMm) * elevPx

  // ── Window drag (2D: horizontal = along wall, vertical = sill height) ───────
  const startWinDrag = useCallback((win: typeof wallWindows[0], e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setSelWinId(win.fx.id)
    winDragRef.current = {
      id: win.fx.id, startClientX: e.clientX, startDistMm: win.distAlong,
      perpDist: win.perpDist,
    }
    const startClientY = e.clientY
    const startSill    = win.sill

    const onMove = (ev: PointerEvent) => {
      const wr = winDragRef.current
      if (!wr) return
      // Horizontal: move along wall
      const dxMm = ((ev.clientX - wr.startClientX) / wallPx) * wallMm
      const newDist = Math.max(0, Math.min(wallMm - win.wMm, wr.startDistMm + dxMm))
      const newX = newDist * w1DirX + wr.perpDist * w1NormX
      const newY = newDist * w1DirY + wr.perpDist * w1NormY
      // Vertical: drag up = higher sill (invert because screen-y and mm-from-floor are opposite)
      const dyMm = -((ev.clientY - startClientY) / elevPx) * wallHeightMm
      const newSill = Math.max(0, Math.min(wallHeightMm - win.hMm, Math.round(startSill + dyMm)))
      setFloorFixtures(prev => prev.map(f =>
        f.id === wr.id ? { ...f, x: newX, y: newY, sill_height_mm: newSill } : f
      ))
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const wr = winDragRef.current
      if (!wr) return
      const upd = floorFixRef.current.find(f => f.id === wr.id)
      if (upd) directus.request(updateItem('floor_fixtures', upd.id, { x: upd.x, y: upd.y, sill_height_mm: upd.sill_height_mm ?? 900 }))
      winDragRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallMm, wallPx, wallHeightMm, elevPx, w1DirX, w1DirY, w1NormX, w1NormY])

  // ── Update window field and save ──────────────────────────────────────────
  const updateWindowField = useCallback((id: number, patch: Partial<FloorFixture>) => {
    setFloorFixtures(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
    directus.request(updateItem('floor_fixtures', id, patch as any))
  }, [])

  // ── Insertion index ────────────────────────────────────────────────────────
  const getInsertIndex = useCallback((
    rowRef: React.RefObject<HTMLDivElement | null>,
    cabs: WallCabinet[],
    pointerX: number,
    excludeId?: string,
  ) => {
    if (!rowRef.current) return cabs.length
    const rect = rowRef.current.getBoundingClientRect()
    const relX = pointerX - rect.left
    const visible = excludeId ? cabs.filter(c => c.instanceId !== excludeId) : cabs
    let cum = 0
    for (let i = 0; i < visible.length; i++) {
      const w = (visible[i].item.width_mm / wallMm) * wallPx
      if (relX < cum + w / 2) return i
      cum += w
    }
    return visible.length
  }, [wallMm, wallPx])

  const getDropPreview = useCallback((px: number, py: number, excludeId?: string) => {
    const check = (ref: React.RefObject<HTMLDivElement | null>, row: 'base' | 'upper', cabs: WallCabinet[]) => {
      if (!ref.current) return null
      const rect = ref.current.getBoundingClientRect()
      if (px >= rect.left - 10 && px <= rect.right + 10 && py >= rect.top - 30 && py <= rect.bottom + 30)
        return { row, index: getInsertIndex(ref, cabs, px, excludeId) }
      return null
    }
    const cur = cabinetsRef.current
    return (
      check(baseRowRef, 'base', cur.filter(c => c.row === 'base').sort((a, b) => a.sort - b.sort)) ||
      check(upperRowRef, 'upper', cur.filter(c => c.row === 'upper').sort((a, b) => a.sort - b.sort))
    )
  }, [getInsertIndex])

  // ── Persist helpers ────────────────────────────────────────────────────────
  const persistAdd = async (item: PaletteItem, row: 'base' | 'upper', sortIndex: number) => {
    const rec = await directus.request(createItem('placed_cabinets', {
      design_id: designId, palette_item_id: item.id, row, sort: sortIndex,
    }))
    return (rec as any).id as number
  }

  const persistReorder = async (cabs: WallCabinet[]) => {
    await Promise.all(
      cabs.map((c, i) => c.dbId !== null
        ? directus.request(updateItem('placed_cabinets', c.dbId, { sort: i, row: c.row }))
        : Promise.resolve()
      )
    )
  }

  const persistDelete = async (dbId: number) => {
    await directus.request(deleteItem('placed_cabinets', dbId))
  }

  // ── Global pointer events ──────────────────────────────────────────────────
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const ds = dragRef.current
      if (!ds) return
      const active = ds.active || Math.hypot(e.clientX - ds.startX, e.clientY - ds.startY) > 8
      const next: DragState = { ...ds, x: e.clientX, y: e.clientY, active }
      dragRef.current = next
      setDragState({ ...next })
      if (active) setDropPreview(getDropPreview(e.clientX, e.clientY, ds.sourceInstanceId))
    }

    const handleUp = async (e: PointerEvent) => {
      const ds = dragRef.current
      if (!ds) return
      dragRef.current = null
      setDragState(null)
      setDropPreview(null)
      if (!ds.active) return

      const preview = getDropPreview(e.clientX, e.clientY, ds.sourceInstanceId)
      if (!preview) return

      setSaving(true)
      try {
        if (ds.sourceInstanceId) {
          // Reorder existing cabinet
          const src = cabinetsRef.current.find(c => c.instanceId === ds.sourceInstanceId)!
          const without = cabinetsRef.current.filter(c => c.instanceId !== ds.sourceInstanceId)
          const targetRow = without.filter(c => c.row === preview.row).sort((a, b) => a.sort - b.sort)
          targetRow.splice(preview.index, 0, { ...src, row: preview.row })

          const baseOrdered = (preview.row === 'base' ? targetRow : without.filter(c => c.row === 'base').sort((a, b) => a.sort - b.sort)).map((c, i) => ({ ...c, sort: i }))
          const upperOrdered = (preview.row === 'upper' ? targetRow : without.filter(c => c.row === 'upper').sort((a, b) => a.sort - b.sort)).map((c, i) => ({ ...c, sort: i }))
          const updated = [...baseOrdered, ...upperOrdered]
          setCabinets(updated)
          await persistReorder(updated)
        } else {
          // New cabinet from palette
          const newCab: WallCabinet = { dbId: null, instanceId: uid(), item: ds.item, row: preview.row, sort: preview.index }
          const rowCabs = cabinetsRef.current.filter(c => c.row === preview.row).sort((a, b) => a.sort - b.sort)
          rowCabs.splice(preview.index, 0, newCab)
          const reordered = rowCabs.map((c, i) => ({ ...c, sort: i }))
          const others = cabinetsRef.current.filter(c => c.row !== preview.row)
          setCabinets([...others, ...reordered])
          const dbId = await persistAdd(ds.item, preview.row, preview.index)
          setCabinets(prev => prev.map(c => c.instanceId === newCab.instanceId ? { ...c, dbId } : c))
          await persistReorder(reordered.filter(c => c.instanceId !== newCab.instanceId))
        }
      } finally {
        setSaving(false)
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [getDropPreview, designId])

  // ── Drag start ─────────────────────────────────────────────────────────────
  const startPaletteDrag = (item: PaletteItem, e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const ds: DragState = { item, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false }
    dragRef.current = ds
    setDragState(ds)
    setSelectedId(null)
  }

  const startCabinetDrag = (cab: WallCabinet, e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const ds: DragState = { item: cab.item, sourceInstanceId: cab.instanceId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false }
    dragRef.current = ds
    setDragState(ds)
  }

  // ── Cabinet controls ───────────────────────────────────────────────────────
  const selectedCab = cabinets.find(c => c.instanceId === selectedId)
  const selectedRow = selectedCab?.row ?? null

  const moveSelected = async (dir: -1 | 1) => {
    if (!selectedId || !selectedRow) return
    const row = cabinets.filter(c => c.row === selectedRow).sort((a, b) => a.sort - b.sort)
    const idx = row.findIndex(c => c.instanceId === selectedId)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= row.length) return
    ;[row[idx], row[newIdx]] = [row[newIdx], row[idx]]
    const reordered = row.map((c, i) => ({ ...c, sort: i }))
    const others = cabinets.filter(c => c.row !== selectedRow)
    setCabinets([...others, ...reordered])
    setSaving(true)
    try { await persistReorder(reordered) } finally { setSaving(false) }
  }

  const deleteSelected = async () => {
    if (!selectedId) return
    const cab = cabinets.find(c => c.instanceId === selectedId)
    if (!cab) return
    setCabinets(prev => prev.filter(c => c.instanceId !== selectedId))
    setSelectedId(null)
    if (cab.dbId !== null) {
      setSaving(true)
      try { await persistDelete(cab.dbId) } finally { setSaving(false) }
    }
  }

  // ── Row renderer ───────────────────────────────────────────────────────────
  const renderRow = (rowCabs: WallCabinet[], row: 'base' | 'upper', rowH: number) => {
    const usedMm = rowCabs.reduce((s, c) => s + c.item.width_mm, 0)
    const remMm = Math.max(0, wallMm - usedMm)
    const remPx = (remMm / wallMm) * wallPx
    const ref = row === 'base' ? baseRowRef : upperRowRef

    return (
      <div ref={ref} style={{ display: 'flex', height: rowH, alignItems: 'stretch', minWidth: 0 }} onClick={() => setSelectedId(null)}>
        {rowCabs.map((cab, i) => {
          const isDragging = dragState?.sourceInstanceId === cab.instanceId && dragState.active
          return (
            <React.Fragment key={cab.instanceId}>
              {dropPreview?.row === row && dropPreview.index === i && <DropIndicator />}
              <div style={{ opacity: isDragging ? 0.35 : 1, transition: 'opacity 0.1s' }}>
                <CabinetFace
                  cabinet={cab}
                  isSelected={selectedId === cab.instanceId}
                  widthPx={(cab.item.width_mm / wallMm) * wallPx}
                  rowH={rowH}
                  isUpper={row === 'upper'}
                  onSelect={() => setSelectedId(prev => prev === cab.instanceId ? null : cab.instanceId)}
                  onPointerDown={e => startCabinetDrag(cab, e)}
                />
              </div>
            </React.Fragment>
          )
        })}
        {dropPreview?.row === row && dropPreview.index === rowCabs.length && <DropIndicator />}
        {remMm > 0 && (
          <div style={{ width: remPx, flexShrink: 0, height: rowH, border: '1px dashed rgba(200,169,110,0.18)', background: 'rgba(200,169,110,0.015)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {remPx > 28 && <span style={{ fontSize: 7, color: 'rgba(200,169,110,0.28)', fontWeight: 700, transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>{remMm}mm</span>}
          </div>
        )}
      </div>
    )
  }

  const tabs: CabinetTab[] = ['Base Units', 'Upper Units', 'Tall Units', 'Corner', 'Appliances']
  const totalBaseMm  = baseCabs.reduce((s, c) => s + c.item.width_mm, 0)
  const totalUpperMm = upperCabs.reduce((s, c) => s + c.item.width_mm, 0)

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #C8A96E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>


      {/* Header */}
      <div style={{ background: '#1A1917', borderBottom: '1px solid #3A3835', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <IconBtn onClick={() => router.push('/designs')}><ChevronLeft /></IconBtn>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F2EDE6' }}>{design?.name ?? 'Cupboards'}</div>
          <div style={{ fontSize: 10, color: '#6A6560' }}>{wallMm}mm wide{saving ? ' · saving…' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn onClick={() => moveSelected(-1)}><ChevronLeft /></IconBtn>
          <IconBtn onClick={() => moveSelected(1)}><ChevronRight /></IconBtn>
        </div>
        <button
          onClick={async () => {
            try {
              await directus.request(updateItem('designs', designId, { badge: 'Complete' } as any))
            } catch {}
            router.push(`/floor-plan/${designId}`)
          }}
          style={{
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#C8A96E,#A07840)',
            color: '#0F0F0E', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Done →
        </button>
      </div>

      {/* Width counters */}
      <div style={{ display: 'flex', gap: 6, padding: '7px 12px', borderBottom: '1px solid #3A3835', overflowX: 'auto', flexShrink: 0, background: '#1A1917' }}>
        {[
          { label: 'Base', mm: totalBaseMm, color: '#C8A96E' },
          { label: 'Upper', mm: totalUpperMm, color: '#6EA8C8' },
          { label: 'Free', mm: Math.max(0, wallMm - totalBaseMm), color: '#6A6560' },
        ].map(({ label, mm, color }) => (
          <div key={label} style={{ display: 'inline-flex', gap: 4, background: '#242220', border: `1px solid ${mm > wallMm ? '#E05C5C' : '#3A3835'}`, borderRadius: 20, padding: '4px 10px', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 10, color: mm > wallMm ? '#E05C5C' : color, fontWeight: 600 }}>
              {label}: {mm}mm{label !== 'Free' ? ` / ${wallMm}mm` : ''} {mm > wallMm ? '⚠' : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Wall canvas */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'linear-gradient(180deg,#1A1815 0%,#141210 100%)', position: 'relative' }}>
        <div style={{ width: 24, flexShrink: 0, background: 'linear-gradient(90deg,#060605 0%,#1A1815 100%)', borderRight: '1px solid #3A3835', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: 22, right: -8, width: 32, height: 82, background: 'linear-gradient(90deg,#252220,#2E2A25)', border: '1px solid #3A3530', borderRight: 'none' }} />
        </div>

        <div ref={wallContainerRef} onClick={() => { setSelectedId(null); setSelWinId(null) }} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#2E2C29', borderBottom: '1px solid #3A3835' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, background: 'repeating-linear-gradient(90deg,#2A2520 0px,#2A2520 59px,#201E1B 59px,#201E1B 60px)', borderTop: '2px solid #4A4845' }} />
          <div style={{ position: 'absolute', inset: '8px 0 22px 0', background: 'linear-gradient(180deg,#1C1916 0%,#161412 100%)' }} />
          <div style={{ position: 'absolute', bottom: 108, left: 0, right: 0, height: 7, background: 'linear-gradient(180deg,#5A4A35,#3A3025)', borderTop: '2px solid #6A5A45', zIndex: 5 }} />
          {/* Dynamic windows from floor plan */}
          {wallWindows.map(win => {
            const leftPx   = (win.distAlong / wallMm) * wallPx
            const widthPx  = Math.max(8, (win.wMm / wallMm) * wallPx)
            const topPx    = Math.max(CEIL_PX, mmToElev(win.sill + win.hMm))
            const botPx    = mmToElev(win.sill)
            const heightPx = Math.max(8, botPx - topPx)
            const isSel    = selWinId === win.fx.id
            return (
              <div
                key={win.fx.id}
                onPointerDown={e => startWinDrag(win, e)}
                onClick={e => { e.stopPropagation(); setSelWinId(isSel ? null : win.fx.id) }}
                style={{
                  position: 'absolute', left: leftPx, top: topPx,
                  width: widthPx, height: heightPx,
                  border: `2px solid ${isSel ? '#C8A96E' : 'rgba(110,168,200,0.55)'}`,
                  background: 'rgba(110,168,200,0.06)',
                  zIndex: 4, cursor: 'grab', touchAction: 'none',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: 'rgba(110,168,200,0.3)' }} />
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(110,168,200,0.3)' }} />
                {/* Always-visible distance label */}
                <div style={{ position: 'absolute', bottom: -16, left: 0, fontSize: 7, color: 'rgba(200,169,110,0.6)', fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                  ←{Math.round(win.distAlong)}
                </div>
                {/* Sill label on left */}
                <div style={{ position: 'absolute', top: '50%', left: -3, transform: 'translateX(-100%) translateY(-50%)', fontSize: 7, color: 'rgba(110,158,181,0.7)', fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                  {win.sill}↑
                </div>
              </div>
            )
          })}

          <div style={{ position: 'absolute', top: 8, left: 0, right: 0, height: 60, zIndex: 6 }}>
            {renderRow(upperCabs, 'upper', 60)}
          </div>
          <div style={{ position: 'absolute', bottom: 22, left: 0, right: 0, height: 86, zIndex: 6 }}>
            {renderRow(baseCabs, 'base', 86)}
          </div>

          {selectedId && selectedRow && (
            <div style={{ position: 'absolute', top: selectedRow === 'upper' ? 72 : 'auto', bottom: selectedRow === 'base' ? 112 : 'auto', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 20, background: '#1A1917', border: '1px solid #C8A96E', borderRadius: 20, padding: '5px 10px', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
              <button onClick={() => moveSelected(-1)} style={{ background: 'none', border: 'none', color: '#C8A96E', padding: '2px 6px', borderRadius: 6 }}><ArrowLeftIcon /></button>
              {selectedCab && <span style={{ fontSize: 10, color: '#9A9590', alignSelf: 'center', whiteSpace: 'nowrap' }}>{selectedCab.item.label} {selectedCab.item.sublabel}</span>}
              <button onClick={() => moveSelected(1)} style={{ background: 'none', border: 'none', color: '#C8A96E', padding: '2px 6px', borderRadius: 6 }}><ArrowRightIcon /></button>
              <div style={{ width: 1, background: '#3A3835', margin: '2px 0' }} />
              <button onClick={deleteSelected} style={{ background: 'none', border: 'none', color: '#E05C5C', padding: '2px 6px', borderRadius: 6 }}><TrashIcon /></button>
            </div>
          )}

          <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 8, color: 'rgba(200,169,110,0.3)', fontWeight: 600, pointerEvents: 'none' }}>
            ← {wallMm}mm →
          </div>
        </div>

        <div style={{ width: 24, flexShrink: 0, background: 'linear-gradient(270deg,#060605 0%,#1A1815 100%)', borderLeft: '1px solid #3A3835', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: 22, left: -8, width: 32, height: 82, background: 'linear-gradient(270deg,#252220,#2E2A25)', border: '1px solid #3A3530', borderLeft: 'none' }} />
        </div>
      </div>

      {/* Palette */}
      <div style={{ background: '#1A1917', borderTop: '1px solid #3A3835', flexShrink: 0 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #3A3835', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', border: 'none', borderBottom: `2px solid ${activeTab === t ? '#C8A96E' : 'transparent'}`, background: 'transparent', color: activeTab === t ? '#C8A96E' : '#6A6560', letterSpacing: '0.3px', transition: 'color 0.15s' }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ padding: '5px 12px 0', fontSize: 10, color: '#4A4845' }}>
          Drag onto wall to place · Tap placed cabinet to select
        </div>
        <div
          ref={paletteScrollRef}
          onScroll={updateThumb}
          style={{
            display: 'grid',
            gridTemplateRows: 'repeat(2, auto)',
            gridAutoFlow: 'column',
            gridAutoColumns: 72,
            gap: 8,
            padding: '8px 12px 4px',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
          }}
        >
          {(palette[activeTab] ?? []).map(item => (
            <PaletteCard
              key={item.id}
              item={item}
              isSelected={dragState?.item.id === item.id && !dragState.sourceInstanceId}
              onPointerDown={e => startPaletteDrag(item, e)}
            />
          ))}
        </div>

        {/* Custom scrollbar — safe swipe zone */}
        <div style={{ padding: '2px 12px 10px', position: 'relative', height: 18 }}>
          {scrollThumb.visible && (
            <>
              {/* Track */}
              <div style={{ position: 'absolute', inset: '6px 12px', background: '#2A2825', borderRadius: 4 }} />
              {/* Thumb */}
              <div
                style={{
                  position: 'absolute', top: 4, height: 10,
                  left: 12 + scrollThumb.left, width: scrollThumb.width,
                  background: '#C8A96E', borderRadius: 5, cursor: 'grab', touchAction: 'none',
                }}
                onPointerDown={e => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  const startX = e.clientX
                  const el = paletteScrollRef.current!
                  const startScroll = el.scrollLeft
                  const trackW = el.clientWidth - scrollThumb.width
                  const scrollRange = el.scrollWidth - el.clientWidth

                  const onMove = (ev: PointerEvent) => {
                    const delta = ev.clientX - startX
                    el.scrollLeft = startScroll + (delta / trackW) * scrollRange
                  }
                  const onUp = () => {
                    window.removeEventListener('pointermove', onMove)
                    window.removeEventListener('pointerup', onUp)
                  }
                  window.addEventListener('pointermove', onMove)
                  window.addEventListener('pointerup', onUp)
                }}
              />
            </>
          )}
        </div>
      </div>

      {dragState?.active && <DragGhost item={dragState.item} x={dragState.x} y={dragState.y} />}

      {/* Window edit panel */}
      {selWinId !== null && (() => {
        const win = wallWindows.find(w => w.fx.id === selWinId)
        if (!win) return null
        const inpSt: React.CSSProperties = {
          width: '100%', background: '#0F0F0E', border: '1px solid #3A3835',
          borderRadius: 8, padding: '6px 8px', color: '#F2EDE6', fontSize: 12,
          outline: 'none', boxSizing: 'border-box',
        }
        return (
          <div style={{ background: '#1A1917', borderTop: '1px solid #C8A96E', padding: '10px 14px', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#C8A96E', marginBottom: 8 }}>
              Window · drag to reposition
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Width mm', val: win.wMm,   key: 'width_mm'      },
                { label: 'Height mm', val: win.hMm,  key: 'height_mm'     },
                { label: 'Sill mm',   val: win.sill, key: 'sill_height_mm'},
              ].map(({ label, val, key }) => (
                <div key={key} style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: '#6A6560', marginBottom: 4 }}>{label}</div>
                  <input
                    style={inpSt}
                    type="number"
                    defaultValue={val}
                    key={`${selWinId}-${key}`}
                    onBlur={e => {
                      const n = parseInt(e.target.value)
                      if (!isNaN(n) && n > 0) updateWindowField(selWinId, { [key]: n } as any)
                    }}
                    onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 1 }}>
                <button
                  onClick={() => setSelWinId(null)}
                  style={{ background: 'none', border: '1px solid #3A3835', borderRadius: 8, padding: '6px 10px', color: '#6A6560', fontSize: 11 }}
                >✕</button>
              </div>
            </div>
            <div style={{ fontSize: 9, color: '#4A4845', marginTop: 6 }}>
              From left: {Math.round(win.distAlong)}mm · Sill: {win.sill}mm · Top: {win.sill + win.hMm}mm
            </div>
          </div>
        )
      })()}

      <BottomNav designId={designId} />
    </div>
  )
}
