'use client'
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readItem, readItems, createItem, updateItem, deleteItem } from '@directus/sdk'
import type { PaletteItem, Design, CabinetTab } from '@/lib/types'
import {
  StatusBar, BottomNav, IconBtn,
  ChevronLeft, ChevronRight, DotsIcon, TrashIcon, ArrowLeftIcon, ArrowRightIcon,
} from './SharedUI'

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
  const handles = item.doors === 0 && !item.is_drawer
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
      {item.is_drawer && (
        <>
          <div style={{ position: 'absolute', top: '33%', left: 4, right: 4, height: 1, background: '#3A3530' }} />
          <div style={{ position: 'absolute', top: '66%', left: 4, right: 4, height: 1, background: '#3A3530' }} />
        </>
      )}
      {item.is_appliance && (
        <div style={{ position: 'absolute', inset: 4, background: 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(200,169,110,0.06) 4px,rgba(200,169,110,0.06) 5px)' }} />
      )}
      {handles.map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: `${pos}%`,
          transform: 'translate(-50%,-50%)',
          width: 2, height: item.is_drawer ? 8 : 13,
          background: item.is_appliance ? 'rgba(110,168,200,0.5)' : 'rgba(200,169,110,0.65)',
          borderRadius: 1,
        }} />
      ))}
      <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontSize: 7, color: isSelected ? '#C8A96E' : 'rgba(90,85,80,0.7)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {item.width_mm}
      </div>
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
      touchAction: 'none', userSelect: 'none', minWidth: 0,
    }}
  >
    <div style={{ width: '100%', height: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: Math.min(42, 14 + item.doors * 10), height: 26, background: 'linear-gradient(180deg,#2E2A25,#252220)', border: `1px solid ${isSelected ? '#C8A96E' : '#3A3530'}`, position: 'relative', borderRadius: 1 }}>
        {item.doors >= 2 && <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: '#3A3530' }} />}
        {item.doors >= 3 && <div style={{ position: 'absolute', top: 0, left: '33%', width: 1, height: '100%', background: '#3A3530' }} />}
        {item.is_drawer && <div style={{ position: 'absolute', top: '45%', left: 0, right: 0, height: 1, background: '#3A3530' }} />}
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

  const dragRef        = useRef<DragState | null>(null)
  const cabinetsRef    = useRef<WallCabinet[]>([])
  const baseRowRef     = useRef<HTMLDivElement>(null)
  const upperRowRef    = useRef<HTMLDivElement>(null)
  const wallContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { cabinetsRef.current = cabinets }, [cabinets])

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [des, cabs, palItems] = await Promise.all([
          directus.request(readItem('designs', designId, { fields: ['*'] })),
          directus.request(readItems('placed_cabinets', {
            filter: { design_id: { _eq: designId } },
            fields: ['*', 'palette_item_id.*'] as any,
            sort: ['row', 'sort'],
          })),
          directus.request(readItems('palette_items', { sort: ['tab', 'width_mm'], limit: -1 })),
        ])
        setDesign(des as Design)

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
        router.replace('/discover')
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
    const ro = new ResizeObserver(() => setWallPx(el.clientWidth))
    ro.observe(el)
    setWallPx(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const wallMm = design?.wall_mm ?? 4200
  const baseCabs  = cabinets.filter(c => c.row === 'base').sort((a, b) => a.sort - b.sort)
  const upperCabs = cabinets.filter(c => c.row === 'upper').sort((a, b) => a.sort - b.sort)

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
      <StatusBar />

      {/* Header */}
      <div style={{ background: '#1A1917', borderBottom: '1px solid #3A3835', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <IconBtn onClick={() => router.push('/floor-plan')}><ChevronLeft /></IconBtn>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F2EDE6' }}>{design?.name ?? 'Design'}</div>
          <div style={{ fontSize: 10, color: '#6A6560' }}>{wallMm}mm wide{saving ? ' · saving…' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn onClick={() => moveSelected(-1)}><ChevronLeft /></IconBtn>
          <IconBtn onClick={() => moveSelected(1)}><ChevronRight /></IconBtn>
        </div>
        <IconBtn><DotsIcon /></IconBtn>
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

        <div ref={wallContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#2E2C29', borderBottom: '1px solid #3A3835' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, background: 'repeating-linear-gradient(90deg,#2A2520 0px,#2A2520 59px,#201E1B 59px,#201E1B 60px)', borderTop: '2px solid #4A4845' }} />
          <div style={{ position: 'absolute', inset: '8px 0 22px 0', background: 'linear-gradient(180deg,#1C1916 0%,#161412 100%)' }} />
          <div style={{ position: 'absolute', bottom: 108, left: 0, right: 0, height: 7, background: 'linear-gradient(180deg,#5A4A35,#3A3025)', borderTop: '2px solid #6A5A45', zIndex: 5 }} />
          <div style={{ position: 'absolute', top: 44, left: '35%', width: '22%', height: 80, border: '2px solid rgba(110,168,200,0.55)', background: 'rgba(110,168,200,0.06)', zIndex: 3, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: 'rgba(110,168,200,0.3)' }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(110,168,200,0.3)' }} />
          </div>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '8px 12px 12px' }}>
          {(palette[activeTab] ?? []).map(item => (
            <PaletteCard
              key={item.id}
              item={item}
              isSelected={dragState?.item.id === item.id && !dragState.sourceInstanceId}
              onPointerDown={e => startPaletteDrag(item, e)}
            />
          ))}
        </div>
      </div>

      {dragState?.active && <DragGhost item={dragState.item} x={dragState.x} y={dragState.y} />}
      <BottomNav designId={designId} />
    </div>
  )
}
