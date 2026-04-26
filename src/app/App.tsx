import React, { useState } from "react";
import type { Screen, AppDesign, FloorFixture, PlacedCabinet } from "./types";
import { INITIAL_FIXTURES, INITIAL_DESIGNS } from "./data";
import { BottomNav } from "./components/SharedUI";
import { LoginScreen }    from "./components/Login";
import { DiscoverScreen } from "./components/Discover";
import { FloorPlanScreen } from "./components/FloorPlan";
import { WallViewScreen } from "./components/WallView";
import { ProfileScreen }  from "./components/Profile";

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { display: none; }
  body {
    background: #080807;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  button { font-family: inherit; }
  input  { font-family: inherit; }
  input::placeholder { color: #6A6560; }
  @keyframes wallPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(200,169,110,0.5); }
    50%       { box-shadow: 0 0 0 10px rgba(200,169,110,0); }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Shared design state
  const [designs, setDesigns]         = useState<AppDesign[]>(INITIAL_DESIGNS);
  const [activeDesignId, setActiveDesignId] = useState<string>("d1");
  const [fixtures, setFixtures]       = useState<FloorFixture[]>(INITIAL_FIXTURES);

  // Pulled from active design
  const activeDesign = designs.find(d => d.id === activeDesignId) || designs[0];

  const setBaseCabinets = (updater: React.SetStateAction<PlacedCabinet[]>) => {
    setDesigns(prev => prev.map(d => {
      if (d.id !== activeDesignId) return d;
      const next = typeof updater === "function" ? updater(d.baseCabinets) : updater;
      return { ...d, baseCabinets: next, badge: "In Progress" };
    }));
  };

  const setUpperCabinets = (updater: React.SetStateAction<PlacedCabinet[]>) => {
    setDesigns(prev => prev.map(d => {
      if (d.id !== activeDesignId) return d;
      const next = typeof updater === "function" ? updater(d.upperCabinets) : updater;
      return { ...d, upperCabinets: next, badge: "In Progress" };
    }));
  };

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail("");
    setScreen("login");
  };

  const handleOpenDesign = (id: string) => {
    setActiveDesignId(id);
  };

  const navigate = (s: Screen) => setScreen(s);

  const renderScreen = () => {
    switch (screen) {
      case "login":
        return <LoginScreen onNavigate={navigate} onLogin={handleLogin} />;

      case "discover":
        return (
          <DiscoverScreen
            onNavigate={navigate}
            designs={designs}
            userEmail={userEmail}
            onOpenDesign={handleOpenDesign}
          />
        );

      case "floorplan":
        return (
          <FloorPlanScreen
            onNavigate={navigate}
            fixtures={fixtures}
            setFixtures={setFixtures}
          />
        );

      case "wallview":
        return (
          <WallViewScreen
            onNavigate={navigate}
            baseCabinets={activeDesign?.baseCabinets || []}
            upperCabinets={activeDesign?.upperCabinets || []}
            setBaseCabinets={setBaseCabinets}
            setUpperCabinets={setUpperCabinets}
          />
        );

      case "profile":
        return (
          <ProfileScreen
            onNavigate={navigate}
            designs={designs}
            userEmail={userEmail}
            onLogout={handleLogout}
          />
        );
    }
  };

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{
        width: 390, minHeight: 844, background: "#0F0F0E",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: "#F2EDE6", display: "flex", flexDirection: "column",
        overflow: "hidden", position: "relative",
      }}>
        {renderScreen()}
        {screen !== "login" && (
          <BottomNav active={screen} onNavigate={navigate} />
        )}
      </div>
    </>
  );
}