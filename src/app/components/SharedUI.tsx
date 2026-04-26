import React from "react";
import type { Screen } from "../types";

// ── Icons ──────────────────────────────────────────────────────────────────
export const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
export const GridIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
  </svg>
);
export const PlusIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
export const ImageIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
export const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
export const ChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);
export const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
export const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
export const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
export const DotsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
  </svg>
);
export const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
export const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);
export const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
export const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
export const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ── Kitchen SVG Preview ────────────────────────────────────────────────────
export const KitchenPreview = ({ variant }: { variant: number }) => {
  const cfgs = [
    { bg: "#1A1410", counter: "#4A3E30", handle: "#C8A96E" },
    { bg: "#151410", counter: "#2A3820", handle: "#6EC87A" },
    { bg: "#181614", counter: "#383220", handle: "#E8C98E" },
    { bg: "#141618", counter: "#202830", handle: "#6EA8C8" },
  ];
  const c = cfgs[variant % 4];
  const labels = ["CAPE TOWN", "JOHANNESBURG", "PRETORIA", "DURBAN"];
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="110" fill={c.bg} />
      <rect y="88" width="160" height="22" fill="#1E1C18" />
      {[10, 45, 80, 115].map(x => (
        <rect key={x} x={x} y="50" width="33" height="38" fill="#2A2620" stroke="#3A3530" strokeWidth="0.5" />
      ))}
      <rect x="8" y="47" width="142" height="5" fill={c.counter} stroke="#5A4A35" strokeWidth="0.5" />
      {[10, 45, 80, 115].map(x => (
        <rect key={x} x={x} y="14" width="33" height="26" fill="#222018" stroke="#3A3530" strokeWidth="0.5" />
      ))}
      {[22, 57, 92, 127].map(x => (
        <rect key={`h${x}`} x={x} y="24" width="2" height="7" fill={c.handle} opacity="0.7" rx="1" />
      ))}
      {[22, 57, 92, 127].map(x => (
        <rect key={`b${x}`} x={x} y="63" width="2" height="10" fill={c.handle} opacity="0.7" rx="1" />
      ))}
      <text x="80" y="100" fill="#5A5550" fontSize="5" textAnchor="middle" fontFamily="sans-serif" fontWeight="600">
        {labels[variant % 4]}
      </text>
    </svg>
  );
};

// ── Status Bar ─────────────────────────────────────────────────────────────
export const StatusBar = () => (
  <div style={{ height: 44, padding: "0 24px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 6, flexShrink: 0 }}>
    <span style={{ fontSize: 15, fontWeight: 700, color: "#F2EDE6" }}>9:41</span>
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      <svg width="16" height="11" viewBox="0 0 20 14" fill="#F2EDE6">
        <rect x="0" y="8" width="3" height="6" rx="0.5"/><rect x="5" y="5" width="3" height="9" rx="0.5"/>
        <rect x="10" y="2" width="3" height="12" rx="0.5"/><rect x="15" y="0" width="3" height="14" rx="0.5"/>
      </svg>
      <svg width="20" height="11" viewBox="0 0 26 14" fill="none" stroke="#F2EDE6" strokeWidth="1.2">
        <rect x="0.6" y="0.6" width="20" height="12.8" rx="2"/>
        <path d="M22 4.5v5a2.5 2.5 0 0 0 0-5z" fill="#F2EDE6" stroke="none"/>
        <rect x="2.5" y="2.5" width="15" height="9" rx="1" fill="#F2EDE6" stroke="none"/>
      </svg>
    </div>
  </div>
);

// ── Icon Button ────────────────────────────────────────────────────────────
export const IconBtn = ({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) => (
  <button
    onClick={onClick}
    style={{
      width: 36, height: 36, borderRadius: 8,
      border: `1px solid ${active ? "#C8A96E" : "#3A3835"}`,
      background: active ? "rgba(200,169,110,0.12)" : "#242220",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", color: active ? "#C8A96E" : "#9A9590", padding: 0,
      transition: "all 0.15s",
    }}
  >
    {children}
  </button>
);

// ── App Header ─────────────────────────────────────────────────────────────
export const AppHeader = ({
  title, subtitle, onBack, actions,
}: {
  title?: React.ReactNode; subtitle?: string;
  onBack?: () => void; actions?: React.ReactNode;
}) => (
  <div style={{
    height: 60, padding: "0 20px", display: "flex", alignItems: "center",
    justifyContent: "space-between", borderBottom: "1px solid #3A3835",
    background: "rgba(15,15,14,0.96)", flexShrink: 0,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {onBack && <IconBtn onClick={onBack}><ChevronLeft /></IconBtn>}
      <div>
        {title && (
          <div style={{
            fontSize: subtitle ? 14 : 22, fontWeight: 700, color: "#F2EDE6",
            fontFamily: subtitle ? "inherit" : "Georgia, 'Times New Roman', serif",
            fontStyle: subtitle ? "normal" : "italic",
          }}>
            {title}
          </div>
        )}
        {subtitle && <div style={{ fontSize: 10, color: "#6A6560", marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
    {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
  </div>
);

// ── Bottom Nav ─────────────────────────────────────────────────────────────
export const BottomNav = ({ active, onNavigate }: { active: Screen; onNavigate: (s: Screen) => void }) => {
  const items = [
    { id: "discover" as Screen, label: "Discover", icon: <HomeIcon /> },
    { id: "floorplan" as Screen, label: "Plans", icon: <GridIcon /> },
    { id: "floorplan" as Screen, label: "New", icon: <PlusIcon size={24} />, primary: true },
    { id: "discover" as Screen, label: "Gallery", icon: <ImageIcon /> },
    { id: "profile" as Screen, label: "Profile", icon: <UserIcon /> },
  ];
  return (
    <nav style={{
      height: 72, background: "#1A1917", borderTop: "1px solid #3A3835",
      display: "flex", alignItems: "center", justifyContent: "space-around",
      padding: "0 8px 8px", flexShrink: 0,
    }}>
      {items.map((item, i) => {
        const isActive = !item.primary && active === item.id;
        return (
          <button
            key={i}
            onClick={() => onNavigate(item.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: item.primary ? "10px 14px" : "8px 10px",
              borderRadius: item.primary ? 14 : 10, border: "none", cursor: "pointer", minWidth: 52,
              background: item.primary ? "#C8A96E" : "transparent",
              marginTop: item.primary ? -12 : 0,
              boxShadow: item.primary ? "0 4px 20px rgba(200,169,110,0.4)" : "none",
              color: item.primary ? "#0F0F0E" : (isActive ? "#C8A96E" : "#6A6560"),
              position: "relative", transition: "all 0.2s",
            }}
          >
            {isActive && (
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 2, background: "#C8A96E", borderRadius: "0 0 2px 2px" }} />
            )}
            {item.icon}
            <span style={{ fontSize: 10, fontWeight: item.primary ? 700 : 500, lineHeight: 1 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
