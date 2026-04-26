import React from "react";
import type { Screen, AppDesign } from "../types";
import { StatusBar, AppHeader, ChevronRight } from "./SharedUI";

interface Props {
  onNavigate: (s: Screen) => void;
  designs: AppDesign[];
  userEmail: string;
  onLogout: () => void;
}

export const ProfileScreen = ({ onNavigate, designs, userEmail, onLogout }: Props) => {
  const firstName = userEmail.split("@")[0];
  const initial   = firstName.charAt(0).toUpperCase();
  const totalCabs = designs.reduce((s, d) => s + d.baseCabinets.length + d.upperCabinets.length, 0);
  const complete  = designs.filter(d => d.badge === "Complete").length;

  const menuGroups = [
    {
      title: "Projects & Designs",
      items: [
        { label: "My Floor Plans",    count: String(designs.length), screen: "floorplan" as Screen },
        { label: "My Designs",        count: String(designs.length), screen: "wallview" as Screen },
        { label: "Share a Design" },
        { label: "Installed Gallery" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Edit Profile" },
        { label: "Security & Password" },
        { label: "Subscription: Pro", badge: "Active", bColor: "#6EC87A", bBg: "rgba(110,200,122,0.12)" },
        { label: "Notifications" },
      ],
    },
    {
      title: "App",
      items: [
        { label: "Help & Support" },
        { label: "Privacy Policy" },
        { label: "Sign Out", danger: true, screen: "login" as Screen, action: onLogout },
      ],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <StatusBar />
      <AppHeader title={<span>cup<em style={{ color: "#C8A96E" }}>boards</em></span>} />
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Profile hero */}
        <div style={{ background: "linear-gradient(135deg,#1A1610 0%,#1A1815 100%)", padding: "20px", display: "flex", gap: 16, alignItems: "center", borderBottom: "1px solid #3A3835" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: "rgba(200,169,110,0.1)", border: "2px solid #C8A96E",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Georgia,serif", fontSize: 28, color: "#C8A96E", flexShrink: 0,
          }}>
            {initial}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#F2EDE6", marginBottom: 4 }}>
              {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#C8A96E", background: "rgba(200,169,110,0.1)", padding: "3px 10px", borderRadius: 20, marginBottom: 4 }}>
              🔧 Contractor Pro
            </div>
            <div style={{ fontSize: 11, color: "#6A6560" }}>{userEmail}</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderBottom: "1px solid #3A3835" }}>
          {[
            [String(designs.length), "Designs"],
            [String(totalCabs), "Cabinets"],
            [String(complete), "Complete"],
          ].map(([v, l]) => (
            <div key={l} style={{ padding: 16, textAlign: "center", borderRight: "1px solid #3A3835" }}>
              <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, color: "#C8A96E" }}>{v}</div>
              <div style={{ fontSize: 10, color: "#6A6560", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Menu groups */}
        {menuGroups.map(g => (
          <div key={g.title} style={{ padding: "14px 20px 4px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#6A6560", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>{g.title}</div>
            {g.items.map((item: any) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.action) item.action();
                  if (item.screen) onNavigate(item.screen);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "13px 12px",
                  borderRadius: 10, border: "none", background: "transparent",
                  cursor: (item.screen || item.action) ? "pointer" : "default",
                  width: "100%", textAlign: "left",
                  color: item.danger ? "#E05C5C" : "#9A9590",
                  transition: "background 0.1s",
                }}
              >
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                {item.count && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#C8A96E", background: "rgba(200,169,110,0.1)", padding: "2px 8px", borderRadius: 20 }}>
                    {item.count}
                  </span>
                )}
                {item.badge && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: item.bColor, background: item.bBg, padding: "2px 8px", borderRadius: 20 }}>
                    {item.badge}
                  </span>
                )}
                {!item.danger && <ChevronRight />}
              </button>
            ))}
          </div>
        ))}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
};
