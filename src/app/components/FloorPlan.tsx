import React, { useState, useRef } from "react";
import type { Screen, FloorFixture, FloorTool } from "../types";
import { uid } from "../data";
import { StatusBar, IconBtn, AppHeader, DotsIcon } from "./SharedUI";

interface Props {
  onNavigate: (s: Screen) => void;
  fixtures: FloorFixture[];
  setFixtures: React.Dispatch<React.SetStateAction<FloorFixture[]>>;
}

const TOOL_TIPS: Record<FloorTool, string> = {
  Wall:    "Tap & drag to draw a wall segment",
  Door:    "Tap a wall edge to place a door",
  Window:  "Tap a wall edge to place a window",
  Basin:   "Tap inside the room to place a basin",
  Stove:   "Tap inside the room to place a stove",
  Measure: "Tap two points to measure distance",
};

const TOOL_CURSORS: Record<FloorTool, string> = {
  Wall: "crosshair", Door: "cell", Window: "cell",
  Basin: "copy", Stove: "copy", Measure: "crosshair",
};

const FixtureIcon = ({ type }: { type: FloorFixture["type"] }) => {
  const icons: Record<FloorFixture["type"], React.ReactNode> = {
    basin: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6EA8C8" strokeWidth="2">
        <ellipse cx="12" cy="12" rx="9" ry="7"/><path d="M12 5v14M8 7l-1-2M16 7l1-2"/>
      </svg>
    ),
    stove: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8A46E" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8" cy="9" r="2"/><circle cx="16" cy="9" r="2"/>
        <rect x="8" y="14" width="8" height="4" rx="1"/>
      </svg>
    ),
    door: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8C98E" strokeWidth="2">
        <path d="M13 4H6v16h12V8z"/><path d="M13 4v4h5"/><circle cx="16" cy="13" r="1" fill="#E8C98E"/>
      </svg>
    ),
    window: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6EA8C8" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/>
      </svg>
    ),
  };
  return <>{icons[type]}</>;
};

export const FloorPlanScreen = ({ onNavigate, fixtures, setFixtures }: Props) => {
  const [activeTool, setActiveTool] = useState<FloorTool>("Wall");
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [measureDist, setMeasureDist] = useState<number | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const tools: FloorTool[] = ["Wall", "Door", "Window", "Basin", "Stove", "Measure"];

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    // Deselect fixture if clicking empty space
    setSelectedFixtureId(null);

    if (activeTool === "Basin") {
      setFixtures(prev => [...prev, { id: uid(), type: "basin", x: xPct, y: yPct }]);
    } else if (activeTool === "Stove") {
      setFixtures(prev => [...prev, { id: uid(), type: "stove", x: xPct, y: yPct }]);
    } else if (activeTool === "Door") {
      // Snap to nearest wall edge
      const snapY = yPct > 50 ? 97 : 3;
      const snapX = Math.max(5, Math.min(95, xPct));
      setFixtures(prev => [...prev, { id: uid(), type: "door", x: snapX, y: snapY }]);
    } else if (activeTool === "Window") {
      const isHorz = yPct < 15 || yPct > 85;
      const snapY = isHorz ? (yPct < 50 ? 2 : 97) : yPct;
      setFixtures(prev => [...prev, { id: uid(), type: "window", x: xPct, y: snapY }]);
    } else if (activeTool === "Measure") {
      const pts = [...measurePoints, { x: xPct, y: yPct }];
      if (pts.length === 2) {
        const dx = (pts[1].x - pts[0].x) / 100 * 4.2;
        const dy = (pts[1].y - pts[0].y) / 100 * 3.6;
        const dist = Math.sqrt(dx * dx + dy * dy);
        setMeasureDist(Math.round(dist * 1000));
        setMeasurePoints([]);
      } else {
        setMeasurePoints(pts);
        setMeasureDist(null);
      }
    }
  };

  const removeFixture = (id: string) => {
    setFixtures(prev => prev.filter(f => f.id !== id));
    setSelectedFixtureId(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <StatusBar />
      <AppHeader
        title="Main Kitchen" subtitle="Floor Plan View"
        onBack={() => onNavigate("discover")}
        actions={<IconBtn onClick={() => onNavigate("wallview")}><span style={{ fontSize: 11, fontWeight: 700, color: "#C8A96E" }}>3D →</span></IconBtn>}
      />

      {/* Tool chips */}
      <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto", borderBottom: "1px solid #3A3835", flexShrink: 0 }}>
        {tools.map(t => (
          <button
            key={t}
            onClick={() => { setActiveTool(t); setMeasurePoints([]); setMeasureDist(null); }}
            style={{
              padding: "7px 14px", borderRadius: 20,
              border: `1px solid ${activeTool === t ? "#C8A96E" : "#3A3835"}`,
              background: activeTool === t ? "rgba(200,169,110,0.12)" : "#242220",
              color: activeTool === t ? "#C8A96E" : "#9A9590",
              fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tool tip */}
      <div style={{ padding: "7px 16px", background: "#151412", borderBottom: "1px solid #2A2825", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#6A6560" }}>{TOOL_TIPS[activeTool]}</span>
        {measureDist !== null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#C8A96E" }}>📏 {measureDist}mm</span>
        )}
        {fixtures.length > 0 && (
          <span style={{ fontSize: 11, color: "#6A6560" }}>{fixtures.length} fixture{fixtures.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#1A1917" }}>
        {/* Grid */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.25, pointerEvents: "none" }}>
          <defs>
            <pattern id="fp-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#4A4845" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fp-grid)"/>
        </svg>

        {/* Clickable canvas overlay */}
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ position: "absolute", inset: 0, cursor: TOOL_CURSORS[activeTool] }}
        >
          {/* Room outline */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -52%)", width: 240, height: 190,
            border: "2px solid #C8A96E", background: "rgba(200,169,110,0.025)",
          }}>
            {/* Labels */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4A4845", letterSpacing: 1, textTransform: "uppercase" }}>Kitchen</div>
              <div style={{ fontSize: 10, color: "#4A4845", marginTop: 2 }}>4.2 × 3.6m</div>
            </div>
            <div style={{ position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#C8A96E", fontWeight: 700, pointerEvents: "none" }}>4200mm</div>
            <div style={{ position: "absolute", left: -34, top: "50%", transform: "translateY(-50%) rotate(-90deg)", fontSize: 9, color: "#C8A96E", fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none" }}>3600mm</div>
          </div>

          {/* Placed fixtures */}
          {fixtures.map(f => {
            const isSelected = selectedFixtureId === f.id;
            return (
              <div
                key={f.id}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedFixtureId(isSelected ? null : f.id);
                }}
                style={{
                  position: "absolute",
                  left: `${f.x}%`, top: `${f.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: 32, height: 32, borderRadius: 8,
                  background: isSelected ? "rgba(200,169,110,0.2)" : "rgba(26,25,23,0.85)",
                  border: `1px solid ${isSelected ? "#C8A96E" : "#4A4845"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", zIndex: 10,
                  boxShadow: isSelected ? "0 0 0 3px rgba(200,169,110,0.2)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <FixtureIcon type={f.type} />
                {isSelected && (
                  <button
                    onClick={e => { e.stopPropagation(); removeFixture(f.id); }}
                    style={{
                      position: "absolute", top: -10, right: -10,
                      width: 20, height: 20, borderRadius: "50%",
                      background: "#E05C5C", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {/* Measure points */}
          {measurePoints.map((pt, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${pt.x}%`, top: `${pt.y}%`,
                transform: "translate(-50%, -50%)",
                width: 10, height: 10, borderRadius: "50%",
                background: "#C8A96E", border: "2px solid #fff",
                pointerEvents: "none", zIndex: 20,
              }}
            />
          ))}
        </div>

        {/* Navigate to wall hint */}
        <div style={{
          position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)",
          background: "#C8A96E", color: "#0F0F0E", fontSize: 12, fontWeight: 700,
          padding: "8px 18px", borderRadius: 20, whiteSpace: "nowrap",
          boxShadow: "0 4px 20px rgba(200,169,110,0.45)", cursor: "pointer",
        }}
          onClick={() => onNavigate("wallview")}
        >
          Tap any wall to design cupboards →
        </div>

        {/* Compass */}
        <div style={{ position: "absolute", bottom: 12, right: 12, width: 40, height: 40, borderRadius: "50%", background: "#242220", border: "1px solid #3A3835", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l2 6-2 1-2-1z" fill="#C8A96E"/>
            <path d="M12 22l2-6-2-1-2 1z" fill="#4A4845"/>
            <circle cx="12" cy="12" r="2" fill="#6A6560"/>
          </svg>
        </div>

        {/* Scale */}
        <div style={{ position: "absolute", bottom: 12, left: 12 }}>
          <div style={{ width: 60, height: 4, background: "#C8A96E", borderRadius: 2 }} />
          <div style={{ fontSize: 9, color: "#6A6560", marginTop: 3, fontWeight: 500 }}>1 metre</div>
        </div>
      </div>
    </div>
  );
};
