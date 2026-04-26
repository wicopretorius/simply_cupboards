import React, { useState } from "react";
import type { Screen, AppDesign } from "../types";
import { StatusBar, AppHeader, IconBtn, SearchIcon, BellIcon, XIcon } from "./SharedUI";
import { KitchenPreview } from "./SharedUI";

const GALLERY = [
  { title: "Modern Shaker", sub: "Cape Town · 4.8 ★", v: 0 },
  { title: "Forest Green",  sub: "Joburg · 4.9 ★",   v: 1 },
  { title: "Walnut Luxe",   sub: "Pretoria · 4.7 ★", v: 2 },
  { title: "Ocean Blue",    sub: "Durban · 5.0 ★",   v: 3 },
  { title: "Matte Black",   sub: "Cape Town · 4.6 ★", v: 0 },
  { title: "Sage Green",    sub: "Joburg · 4.9 ★",   v: 1 },
];

interface Props {
  onNavigate: (s: Screen) => void;
  designs: AppDesign[];
  userEmail: string;
  onOpenDesign: (id: string) => void;
}

export const DiscoverScreen = ({ onNavigate, designs, userEmail, onOpenDesign }: Props) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.toLowerCase();
  const filteredGallery = GALLERY.filter(g => !q || g.title.toLowerCase().includes(q) || g.sub.toLowerCase().includes(q));
  const filteredDesigns = designs.filter(d => !q || d.name.toLowerCase().includes(q) || d.sub.toLowerCase().includes(q));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <StatusBar />
      <AppHeader
        title={<span>cup<em style={{ color: "#C8A96E" }}>boards</em></span>}
        actions={
          <>
            <IconBtn active={searchOpen} onClick={() => { setSearchOpen(p => !p); setQuery(""); }}>
              <SearchIcon />
            </IconBtn>
            <IconBtn><BellIcon /></IconBtn>
          </>
        }
      />

      {/* Search bar */}
      {searchOpen && (
        <div style={{ padding: "10px 16px", background: "#1A1917", borderBottom: "1px solid #3A3835", display: "flex", gap: 10, alignItems: "center" }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search designs, styles, locations…"
            style={{
              flex: 1, background: "#242220", border: "1px solid #3A3835", borderRadius: 8,
              padding: "10px 14px", fontSize: 14, color: "#F2EDE6", outline: "none", fontFamily: "inherit",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "#6A6560", cursor: "pointer", padding: 4 }}>
              <XIcon />
            </button>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

        {/* Hero banner */}
        {!query && (
          <div style={{ background: "linear-gradient(135deg,#1A1410 0%,#2A2018 50%,#1A1815 100%)", padding: "20px 20px 0", position: "relative", overflow: "hidden" }}>
            <svg style={{ position: "absolute", bottom: 0, left: 0, right: 0, pointerEvents: "none" }} height="70" viewBox="0 0 390 70" preserveAspectRatio="none">
              {[30, 110, 195, 275, 335].map((x, i) => (
                <g key={i} opacity="0.2">
                  <rect x={x} y="8" width={i % 2 === 0 ? 68 : 50} height="58" fill="none" stroke="#C8A96E" strokeWidth="0.6"/>
                  <line x1={x + 14} y1="8" x2={x + 14} y2="66" stroke="#C8A96E" strokeWidth="0.4"/>
                </g>
              ))}
            </svg>
            <div style={{ position: "relative", zIndex: 2 }}>
              <p style={{ fontSize: 11, color: "#6A6560", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>
                {greeting}
              </p>
              <h1 style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 26, color: "#F2EDE6", lineHeight: 1.25, marginBottom: 16 }}>
                Design your <em style={{ color: "#C8A96E" }}>dream</em><br />kitchen today
              </h1>
              <div style={{ display: "flex", gap: 10, paddingBottom: 20 }}>
                {[
                  [String(designs.length), "Designs"],
                  [String(designs.filter(d => d.badge !== "Draft").length), "Plans"],
                  ["128", "Cabinets"],
                ].map(([val, label]) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#C8A96E", lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: 10, color: "#6A6560", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Gallery */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 10px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6A6560", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            Inspiration Gallery {query && `(${filteredGallery.length})`}
          </span>
          <span style={{ fontSize: 11, color: "#C8A96E", fontWeight: 500, cursor: "pointer" }}>See All</span>
        </div>
        {filteredGallery.length > 0 ? (
          <div style={{ display: "flex", gap: 12, padding: "0 20px 4px", overflowX: "auto" }}>
            {filteredGallery.map((g, i) => (
              <div key={i} style={{ width: 155, flexShrink: 0, borderRadius: 14, overflow: "hidden", background: "#1A1917", border: "1px solid #3A3835", cursor: "pointer" }}>
                <div style={{ height: 108 }}><KitchenPreview variant={g.v} /></div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#F2EDE6" }}>{g.title}</div>
                  <div style={{ fontSize: 11, color: "#6A6560" }}>{g.sub}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "16px 20px", fontSize: 13, color: "#6A6560" }}>No gallery results for "{query}"</div>
        )}

        {/* My Designs */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 10px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6A6560", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            My Designs {query && `(${filteredDesigns.length})`}
          </span>
          <button
            onClick={() => onNavigate("floorplan")}
            style={{ fontSize: 11, color: "#C8A96E", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
          >
            + New
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 20px 24px" }}>
          {filteredDesigns.length > 0 ? filteredDesigns.map((d, i) => (
            <button
              key={d.id}
              onClick={() => { onOpenDesign(d.id); onNavigate("wallview"); }}
              style={{
                background: "#1A1917", border: "1px solid #3A3835", borderRadius: 14,
                padding: 14, display: "flex", gap: 14, alignItems: "center",
                cursor: "pointer", width: "100%", textAlign: "left",
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ width: 64, height: 50, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid #3A3835" }}>
                <KitchenPreview variant={d.variant} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#F2EDE6", marginBottom: 3 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "#6A6560" }}>{d.sub}</div>
              </div>
              <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 600, color: d.bColor, background: d.bBg, whiteSpace: "nowrap" }}>
                {d.badge}
              </span>
            </button>
          )) : (
            <div style={{ padding: "16px 0", fontSize: 13, color: "#6A6560" }}>No designs match "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
};
