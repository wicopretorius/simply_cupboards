import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import type { Screen, CabinetTab, PaletteItem, PlacedCabinet } from "../types";
import { PALETTE, WALL_MM, uid } from "../data";
import { StatusBar, IconBtn, ChevronLeft, ChevronRight, DotsIcon, TrashIcon, ArrowLeftIcon, ArrowRightIcon } from "./SharedUI";

interface Props {
  onNavigate: (s: Screen) => void;
  baseCabinets: PlacedCabinet[];
  upperCabinets: PlacedCabinet[];
  setBaseCabinets: React.Dispatch<React.SetStateAction<PlacedCabinet[]>>;
  setUpperCabinets: React.Dispatch<React.SetStateAction<PlacedCabinet[]>>;
}

interface DragState {
  item: PaletteItem;
  sourceId?: string;       // if moving existing cabinet
  sourceRow?: "base" | "upper";
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;         // moved past threshold
}

// ── Cabinet face ────────────────────────────────────────────────────────────
const CabinetFace = ({
  cabinet, isSelected, widthPx, rowH, isUpper,
  onSelect, onPointerDown,
}: {
  cabinet: PlacedCabinet;
  isSelected: boolean;
  widthPx: number;
  rowH: number;
  isUpper: boolean;
  onSelect: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
}) => {
  const { item } = cabinet;
  const handlePositions: number[] = [];
  if (item.doors === 0 && !item.isDrawer) {
    handlePositions.push(50);
  } else {
    for (let d = 0; d < item.doors; d++) {
      handlePositions.push(((d + 0.5) / item.doors) * 100);
    }
  }

  return (
    <div
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onPointerDown={onPointerDown}
      title={`${item.label} ${item.sublabel}`}
      style={{
        width: widthPx,
        height: rowH,
        background: isSelected
          ? "linear-gradient(180deg,#3C3228,#302820)"
          : isUpper
          ? "linear-gradient(180deg,#282420,#222018)"
          : "linear-gradient(180deg,#2E2A25,#252220)",
        border: `1px solid ${isSelected ? "#C8A96E" : "#3A3530"}`,
        boxShadow: isSelected ? "0 0 0 1px rgba(200,169,110,0.35), inset 0 0 10px rgba(200,169,110,0.08)" : "none",
        position: "relative",
        cursor: "grab",
        flexShrink: 0,
        touchAction: "none",
        userSelect: "none",
        transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
        overflow: "hidden",
      }}
    >
      {/* Door dividers */}
      {item.doors >= 2 && Array.from({ length: item.doors - 1 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute", top: 0,
          left: `${((i + 1) / item.doors) * 100}%`,
          width: 1, height: "100%", background: "#3A3530",
        }} />
      ))}

      {/* Drawer lines */}
      {item.isDrawer && (
        <>
          <div style={{ position: "absolute", top: "33%", left: 4, right: 4, height: 1, background: "#3A3530" }} />
          <div style={{ position: "absolute", top: "66%", left: 4, right: 4, height: 1, background: "#3A3530" }} />
        </>
      )}

      {/* Appliance hatching */}
      {item.isAppliance && (
        <div style={{
          position: "absolute", inset: 4,
          background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(200,169,110,0.06) 4px, rgba(200,169,110,0.06) 5px)",
        }} />
      )}

      {/* Handles */}
      {handlePositions.map((pos, i) => (
        <div key={i} style={{
          position: "absolute",
          top: "50%", left: `${pos}%`,
          transform: "translate(-50%, -50%)",
          width: 2, height: item.isDrawer ? 8 : 13,
          background: item.isAppliance ? "rgba(110,168,200,0.5)" : "rgba(200,169,110,0.65)",
          borderRadius: 1,
        }} />
      ))}

      {/* Width label */}
      <div style={{
        position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
        fontSize: 7, color: isSelected ? "#C8A96E" : "rgba(90,85,80,0.7)",
        fontWeight: 600, whiteSpace: "nowrap", letterSpacing: "0.3px",
      }}>
        {item.widthMm}
      </div>

      {/* Selection top indicator */}
      {isSelected && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 2, background: "#C8A96E",
          boxShadow: "0 0 6px rgba(200,169,110,0.8)",
        }} />
      )}
    </div>
  );
};

// ── Drop indicator ──────────────────────────────────────────────────────────
const DropIndicator = () => (
  <div style={{
    width: 3, flexShrink: 0, alignSelf: "stretch",
    background: "#C8A96E",
    boxShadow: "0 0 8px rgba(200,169,110,0.7)",
    borderRadius: 2,
    zIndex: 10,
  }} />
);

// ── Ghost element ───────────────────────────────────────────────────────────
const DragGhost = ({ item, x, y }: { item: PaletteItem; x: number; y: number }) => (
  <div style={{
    position: "fixed",
    left: x - 30, top: y - 20,
    pointerEvents: "none", zIndex: 9999,
    opacity: 0.85, transform: "rotate(2deg) scale(1.05)",
    transition: "none",
  }}>
    <div style={{
      width: 60, height: 40,
      background: "linear-gradient(180deg,#3A3228,#2E2820)",
      border: "2px solid #C8A96E",
      borderRadius: 4,
      boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 0 12px rgba(200,169,110,0.3)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#C8A96E" }}>{item.label}</div>
      <div style={{ fontSize: 8, color: "#6A6560" }}>{item.sublabel}</div>
    </div>
  </div>
);

// ── Palette item ────────────────────────────────────────────────────────────
const PaletteCard = ({ item, isSelected, onPointerDown }: {
  item: PaletteItem;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) => {
  const doors = item.doors;
  return (
    <button
      onPointerDown={onPointerDown}
      style={{
        background: isSelected ? "rgba(200,169,110,0.12)" : "#242220",
        border: `1px solid ${isSelected ? "#C8A96E" : "#3A3835"}`,
        borderRadius: 10,
        padding: "8px 6px 6px",
        cursor: "grab",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
        touchAction: "none", userSelect: "none",
        boxShadow: isSelected ? "0 0 0 1px rgba(200,169,110,0.3)" : "none",
        transition: "all 0.15s", minWidth: 0,
      }}
    >
      {/* Mini cabinet preview */}
      <div style={{ width: "100%", height: 32, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{
          width: Math.min(42, 14 + doors * 10), height: 26,
          background: "linear-gradient(180deg,#2E2A25,#252220)",
          border: `1px solid ${isSelected ? "#C8A96E" : "#3A3530"}`,
          position: "relative", borderRadius: 1,
        }}>
          {doors >= 2 && <div style={{ position: "absolute", top: 0, left: "50%", width: 1, height: "100%", background: "#3A3530" }} />}
          {doors >= 3 && <div style={{ position: "absolute", top: 0, left: "33%", width: 1, height: "100%", background: "#3A3530" }} />}
          {item.isDrawer && <div style={{ position: "absolute", top: "45%", left: 0, right: 0, height: 1, background: "#3A3530" }} />}
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 9, color: isSelected ? "#C8A96E" : "#9A9590", fontWeight: 600, lineHeight: 1.2 }}>{item.label}</div>
        <div style={{ fontSize: 8, color: "#5A5550", lineHeight: 1.2 }}>{item.sublabel}</div>
      </div>
    </button>
  );
};

// ── Main Screen ─────────────────────────────────────────────────────────────
export const WallViewScreen = ({
  onNavigate, baseCabinets, upperCabinets, setBaseCabinets, setUpperCabinets,
}: Props) => {
  const [activeTab, setActiveTab] = useState<CabinetTab>("Base Units");
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [dragState, setDragState]     = useState<DragState | null>(null);
  const [dropPreview, setDropPreview] = useState<{ row: "base" | "upper"; index: number } | null>(null);

  // Refs for stable access inside effect closures
  const baseRef = useRef(baseCabinets);
  const upperRef = useRef(upperCabinets);
  useEffect(() => { baseRef.current = baseCabinets; }, [baseCabinets]);
  useEffect(() => { upperRef.current = upperCabinets; }, [upperCabinets]);

  const dragRef = useRef<DragState | null>(null);

  const baseRowRef  = useRef<HTMLDivElement>(null);
  const upperRowRef = useRef<HTMLDivElement>(null);
  const wallContainerRef = useRef<HTMLDivElement>(null);
  const [wallPx, setWallPx] = useState(342);

  // Measure available wall pixel width
  useLayoutEffect(() => {
    const el = wallContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWallPx(el.clientWidth));
    ro.observe(el);
    setWallPx(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const tabs: CabinetTab[] = ["Base Units", "Upper Units", "Tall Units", "Corner", "Appliances"];

  const totalBaseMm  = baseCabinets.reduce((s, c) => s + c.item.widthMm, 0);
  const totalUpperMm = upperCabinets.reduce((s, c) => s + c.item.widthMm, 0);
  const isBaseOverflow  = totalBaseMm  > WALL_MM;
  const isUpperOverflow = totalUpperMm > WALL_MM;

  // ── Insertion index ────────────────────────────────────────────────────────
  const getInsertIndex = (
    rowRef: React.RefObject<HTMLDivElement>,
    cabinets: PlacedCabinet[],
    pointerX: number,
    excludeId?: string,
  ): number => {
    if (!rowRef.current) return cabinets.length;
    const rect = rowRef.current.getBoundingClientRect();
    const relX  = pointerX - rect.left;
    const visible = excludeId ? cabinets.filter(c => c.instanceId !== excludeId) : cabinets;
    let cum = 0;
    for (let i = 0; i < visible.length; i++) {
      const w = (visible[i].item.widthMm / WALL_MM) * wallPx;
      if (relX < cum + w / 2) return i;
      cum += w;
    }
    return visible.length;
  };

  const getDropPreview = (px: number, py: number, excludeId?: string) => {
    const checkRow = (
      ref: React.RefObject<HTMLDivElement>,
      row: "base" | "upper",
      cabs: PlacedCabinet[],
    ) => {
      if (!ref.current) return null;
      const rect = ref.current.getBoundingClientRect();
      if (px >= rect.left - 10 && px <= rect.right + 10 && py >= rect.top - 30 && py <= rect.bottom + 30) {
        return { row, index: getInsertIndex(ref, cabs, px, excludeId) };
      }
      return null;
    };
    return checkRow(baseRowRef, "base", baseRef.current) ||
           checkRow(upperRowRef, "upper", upperRef.current);
  };

  // ── Global pointer events ──────────────────────────────────────────────────
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const ds = dragRef.current;
      if (!ds) return;
      const active = ds.active || Math.hypot(e.clientX - ds.startX, e.clientY - ds.startY) > 8;
      const next: DragState = { ...ds, x: e.clientX, y: e.clientY, active };
      dragRef.current = next;
      setDragState({ ...next });
      if (active) {
        setDropPreview(getDropPreview(e.clientX, e.clientY, ds.sourceId));
      }
    };

    const handleUp = (e: PointerEvent) => {
      const ds = dragRef.current;
      if (!ds) return;

      if (ds.active) {
        const preview = getDropPreview(e.clientX, e.clientY, ds.sourceId);
        if (preview) {
          if (ds.sourceId) {
            // Reorder existing cabinet
            const srcInBase = baseRef.current.some(c => c.instanceId === ds.sourceId);
            const cabinet = (srcInBase ? baseRef.current : upperRef.current).find(c => c.instanceId === ds.sourceId)!;
            const newBase  = baseRef.current.filter(c => c.instanceId !== ds.sourceId);
            const newUpper = upperRef.current.filter(c => c.instanceId !== ds.sourceId);

            if (preview.row === "base") {
              newBase.splice(preview.index, 0, cabinet);
              setBaseCabinets([...newBase]);
              setUpperCabinets([...newUpper]);
            } else {
              newUpper.splice(preview.index, 0, cabinet);
              setBaseCabinets([...newBase]);
              setUpperCabinets([...newUpper]);
            }
          } else {
            // New cabinet from palette
            const newCab: PlacedCabinet = { instanceId: uid(), item: ds.item };
            if (preview.row === "base") {
              const list = [...baseRef.current];
              list.splice(preview.index, 0, newCab);
              setBaseCabinets(list);
            } else {
              const list = [...upperRef.current];
              list.splice(preview.index, 0, newCab);
              setUpperCabinets(list);
            }
          }
        }
      }

      dragRef.current = null;
      setDragState(null);
      setDropPreview(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [wallPx]);

  // ── Drag start helpers ─────────────────────────────────────────────────────
  const startPaletteDrag = (item: PaletteItem, e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ds: DragState = { item, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false };
    dragRef.current = ds;
    setDragState(ds);
    setSelectedId(null);
  };

  const startCabinetDrag = (cab: PlacedCabinet, row: "base" | "upper", e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const ds: DragState = {
      item: cab.item, sourceId: cab.instanceId, sourceRow: row,
      startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false,
    };
    dragRef.current = ds;
    setDragState(ds);
  };

  // ── Cabinet controls ───────────────────────────────────────────────────────
  const selectedRow = baseCabinets.find(c => c.instanceId === selectedId)
    ? "base" : upperCabinets.find(c => c.instanceId === selectedId) ? "upper" : null;

  const moveSelected = (dir: -1 | 1) => {
    if (!selectedId || !selectedRow) return;
    const list = selectedRow === "base" ? baseCabinets : upperCabinets;
    const idx  = list.findIndex(c => c.instanceId === selectedId);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= list.length) return;
    const next = [...list];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    selectedRow === "base" ? setBaseCabinets(next) : setUpperCabinets(next);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setBaseCabinets(prev => prev.filter(c => c.instanceId !== selectedId));
    setUpperCabinets(prev => prev.filter(c => c.instanceId !== selectedId));
    setSelectedId(null);
  };

  const selectedCabinet = [...baseCabinets, ...upperCabinets].find(c => c.instanceId === selectedId);

  // ── Row renderer ───────────────────────────────────────────────────────────
  const renderRow = (cabs: PlacedCabinet[], row: "base" | "upper", rowH: number) => {
    const usedMm = cabs.reduce((s, c) => s + c.item.widthMm, 0);
    const remMm  = Math.max(0, WALL_MM - usedMm);
    const remPx  = (remMm / WALL_MM) * wallPx;

    return (
      <div
        ref={row === "base" ? baseRowRef : upperRowRef}
        style={{ display: "flex", height: rowH, alignItems: "stretch", minWidth: 0 }}
        onClick={() => setSelectedId(null)}
      >
        {cabs.map((cab, i) => {
          const isDragging = dragState?.sourceId === cab.instanceId && dragState.active;
          return (
            <React.Fragment key={cab.instanceId}>
              {dropPreview?.row === row && dropPreview.index === i && <DropIndicator />}
              <div style={{ opacity: isDragging ? 0.35 : 1, transition: "opacity 0.1s" }}>
                <CabinetFace
                  cabinet={cab}
                  isSelected={selectedId === cab.instanceId}
                  widthPx={(cab.item.widthMm / WALL_MM) * wallPx}
                  rowH={rowH}
                  isUpper={row === "upper"}
                  onSelect={() => setSelectedId(prev => prev === cab.instanceId ? null : cab.instanceId)}
                  onPointerDown={e => startCabinetDrag(cab, row, e)}
                />
              </div>
            </React.Fragment>
          );
        })}
        {dropPreview?.row === row && dropPreview.index === cabs.length && <DropIndicator />}

        {/* Remaining space */}
        {remMm > 0 && (
          <div style={{
            width: remPx, flexShrink: 0, height: rowH,
            border: "1px dashed rgba(200,169,110,0.18)",
            background: "rgba(200,169,110,0.015)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {remPx > 28 && (
              <span style={{
                fontSize: 7, color: "rgba(200,169,110,0.28)",
                fontWeight: 700, transform: "rotate(-90deg)", whiteSpace: "nowrap",
              }}>
                {remMm}mm
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <StatusBar />

      {/* Wall header */}
      <div style={{ background: "#1A1917", borderBottom: "1px solid #3A3835", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <IconBtn onClick={() => onNavigate("floorplan")}><ChevronLeft /></IconBtn>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#F2EDE6" }}>North Wall</div>
          <div style={{ fontSize: 10, color: "#6A6560" }}>4200mm wide · Height: 2400mm</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <IconBtn><ChevronLeft /></IconBtn>
          <IconBtn><ChevronRight /></IconBtn>
        </div>
        <IconBtn><DotsIcon /></IconBtn>
      </div>

      {/* Width counters */}
      <div style={{ display: "flex", gap: 6, padding: "7px 12px", borderBottom: "1px solid #3A3835", overflowX: "auto", flexShrink: 0, background: "#1A1917" }}>
        <div style={{ display: "inline-flex", gap: 4, background: "#242220", border: `1px solid ${isBaseOverflow ? "#E05C5C" : "#3A3835"}`, borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 10, color: isBaseOverflow ? "#E05C5C" : "#C8A96E", fontWeight: 600 }}>
            Base: {totalBaseMm}mm / {WALL_MM}mm {isBaseOverflow ? "⚠" : ""}
          </span>
        </div>
        <div style={{ display: "inline-flex", gap: 4, background: "#242220", border: `1px solid ${isUpperOverflow ? "#E05C5C" : "#3A3835"}`, borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 10, color: isUpperOverflow ? "#E05C5C" : "#6EA8C8", fontWeight: 600 }}>
            Upper: {totalUpperMm}mm / {WALL_MM}mm {isUpperOverflow ? "⚠" : ""}
          </span>
        </div>
        <div style={{ display: "inline-flex", gap: 4, background: "#242220", border: "1px solid #3A3835", borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 10, color: "#6A6560", fontWeight: 500 }}>Free: {Math.max(0, WALL_MM - totalBaseMm)}mm</span>
        </div>
      </div>

      {/* ── Wall canvas ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "linear-gradient(180deg,#1A1815 0%,#141210 100%)", position: "relative" }}>

        {/* Left bezel */}
        <div style={{ width: 24, flexShrink: 0, background: "linear-gradient(90deg,#060605 0%,#1A1815 100%)", borderRight: "1px solid #3A3835", position: "relative" }}>
          <div style={{ position: "absolute", bottom: 22, right: -8, width: 32, height: 82, background: "linear-gradient(90deg,#252220,#2E2A25)", border: "1px solid #3A3530", borderRight: "none" }} />
        </div>

        {/* Main wall */}
        <div ref={wallContainerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Ceiling */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: "#2E2C29", borderBottom: "1px solid #3A3835" }} />
          {/* Floor */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 22,
            background: "repeating-linear-gradient(90deg,#2A2520 0px,#2A2520 59px,#201E1B 59px,#201E1B 60px)",
            borderTop: "2px solid #4A4845",
          }} />
          {/* Wall surface */}
          <div style={{ position: "absolute", inset: "8px 0 22px 0", background: "linear-gradient(180deg,#1C1916 0%,#161412 100%)" }} />
          {/* Counter top */}
          <div style={{ position: "absolute", bottom: 108, left: 0, right: 0, height: 7, background: "linear-gradient(180deg,#5A4A35,#3A3025)", borderTop: "2px solid #6A5A45", zIndex: 5 }} />

          {/* Window opening */}
          <div style={{ position: "absolute", top: 44, left: "35%", width: "22%", height: 80, border: "2px solid rgba(110,168,200,0.55)", background: "rgba(110,168,200,0.06)", zIndex: 3, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: 0, left: "50%", width: 1, height: "100%", background: "rgba(110,168,200,0.3)" }} />
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(110,168,200,0.3)" }} />
            <div style={{ position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)", fontSize: 8, color: "#6EA8C8", fontWeight: 700, whiteSpace: "nowrap" }}>900mm</div>
          </div>

          {/* ── UPPER CABINET ROW ── */}
          <div style={{ position: "absolute", top: 8, left: 0, right: 0, height: 60, zIndex: 6 }}>
            {renderRow(upperCabinets, "upper", 60)}
          </div>

          {/* ── BASE CABINET ROW ── */}
          <div style={{ position: "absolute", bottom: 22, left: 0, right: 0, height: 86, zIndex: 6 }}>
            {renderRow(baseCabinets, "base", 86)}
          </div>

          {/* Selected cabinet controls */}
          {selectedId && selectedRow && (
            <div style={{
              position: "absolute",
              top: selectedRow === "upper" ? 72 : "auto",
              bottom: selectedRow === "base" ? 112 : "auto",
              left: "50%", transform: "translateX(-50%)",
              display: "flex", gap: 6, zIndex: 20,
              background: "#1A1917", border: "1px solid #C8A96E",
              borderRadius: 20, padding: "5px 10px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}>
              <button onClick={() => moveSelected(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "#C8A96E", padding: "2px 6px", borderRadius: 6 }}>
                <ArrowLeftIcon />
              </button>
              {selectedCabinet && (
                <span style={{ fontSize: 10, color: "#9A9590", alignSelf: "center", whiteSpace: "nowrap" }}>
                  {selectedCabinet.item.label} {selectedCabinet.item.sublabel}
                </span>
              )}
              <button onClick={() => moveSelected(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "#C8A96E", padding: "2px 6px", borderRadius: 6 }}>
                <ArrowRightIcon />
              </button>
              <div style={{ width: 1, background: "#3A3835", margin: "2px 0" }} />
              <button onClick={deleteSelected} style={{ background: "none", border: "none", cursor: "pointer", color: "#E05C5C", padding: "2px 6px", borderRadius: 6 }}>
                <TrashIcon />
              </button>
            </div>
          )}

          {/* Measurement guide */}
          <div style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", fontSize: 8, color: "rgba(200,169,110,0.3)", fontWeight: 600, pointerEvents: "none" }}>
            ← 4200mm →
          </div>
        </div>

        {/* Right bezel */}
        <div style={{ width: 24, flexShrink: 0, background: "linear-gradient(270deg,#060605 0%,#1A1815 100%)", borderLeft: "1px solid #3A3835", position: "relative" }}>
          <div style={{ position: "absolute", bottom: 22, left: -8, width: 32, height: 82, background: "linear-gradient(270deg,#252220,#2E2A25)", border: "1px solid #3A3530", borderLeft: "none" }} />
        </div>
      </div>

      {/* ── Cabinet palette ──────────────────────────────────────────────────── */}
      <div style={{ background: "#1A1917", borderTop: "1px solid #3A3835", flexShrink: 0 }}>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #3A3835", overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: "9px 14px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
              border: "none", borderBottom: `2px solid ${activeTab === t ? "#C8A96E" : "transparent"}`,
              background: "transparent", cursor: "pointer",
              color: activeTab === t ? "#C8A96E" : "#6A6560", letterSpacing: "0.3px",
              transition: "color 0.15s",
            }}>{t}</button>
          ))}
        </div>

        {/* Instruction */}
        <div style={{ padding: "5px 12px 0", fontSize: 10, color: "#4A4845" }}>
          Drag onto wall to place · Tap placed cabinet to select
        </div>

        {/* Cabinet grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, padding: "8px 12px 12px" }}>
          {PALETTE[activeTab].map(item => (
            <PaletteCard
              key={item.id}
              item={item}
              isSelected={dragState?.item.id === item.id && !dragState.sourceId}
              onPointerDown={e => startPaletteDrag(item, e)}
            />
          ))}
        </div>
      </div>

      {/* Drag ghost overlay */}
      {dragState?.active && (
        <DragGhost item={dragState.item} x={dragState.x} y={dragState.y} />
      )}
    </div>
  );
};