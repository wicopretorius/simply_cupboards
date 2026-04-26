import React, { useState } from "react";
import type { Screen } from "../types";
import { StatusBar, CheckIcon } from "./SharedUI";

interface Props {
  onNavigate: (s: Screen) => void;
  onLogin: (email: string) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginScreen = ({ onNavigate, onLogin }: Props) => {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim())             e.email    = "Email is required";
    else if (!emailRegex.test(email)) e.email = "Enter a valid email address";
    if (!password)                 e.password = "Password is required";
    else if (password.length < 6)  e.password = "Password must be at least 6 characters";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin(email);
      onNavigate("discover");
    }, 1200);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", background: "linear-gradient(160deg,#1A1410 0%,#0F0F0E 60%)" }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Logo area */}
        <div style={{ padding: "32px 32px 20px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, background: "rgba(200,169,110,0.1)", border: "1px solid #C8A96E", borderRadius: 20, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20M9 3v6M15 3v6"/><path d="M7 15h10M7 18h6"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 32, color: "#F2EDE6", margin: "0 0 6px" }}>
            cup<em style={{ color: "#C8A96E" }}>boards</em>
          </h1>
          <p style={{ fontSize: 13, color: "#6A6560" }}>Design. Plan. Build. Beautifully.</p>
        </div>

        {/* Form */}
        <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Email */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6A6560", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Email Address</div>
            <input
              type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
              placeholder="your@email.com"
              style={{
                width: "100%", background: "#242220",
                border: `1px solid ${errors.email ? "#E05C5C" : "#3A3835"}`,
                borderRadius: 10, padding: "14px 16px", fontSize: 15,
                color: "#F2EDE6", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
            />
            {errors.email && <div style={{ fontSize: 11, color: "#E05C5C", marginTop: 5 }}>{errors.email}</div>}
          </div>

          {/* Password */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6A6560", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Password</div>
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"} value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                placeholder="••••••••"
                style={{
                  width: "100%", background: "#242220",
                  border: `1px solid ${errors.password ? "#E05C5C" : "#3A3835"}`,
                  borderRadius: 10, padding: "14px 48px 14px 16px", fontSize: 15,
                  color: "#F2EDE6", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
              />
              <button
                onClick={() => setShowPwd(p => !p)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6A6560", fontSize: 12 }}
              >
                {showPwd ? "HIDE" : "SHOW"}
              </button>
            </div>
            {errors.password && <div style={{ fontSize: 11, color: "#E05C5C", marginTop: 5 }}>{errors.password}</div>}
          </div>

          <div style={{ textAlign: "right", marginTop: -6 }}>
            <span style={{ fontSize: 12, color: "#C8A96E", fontWeight: 500, cursor: "pointer" }}>Forgot Password?</span>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading ? "#8A7548" : "#C8A96E", color: "#0F0F0E",
              border: "none", borderRadius: 10, padding: 16,
              fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer",
              fontFamily: "inherit", letterSpacing: "0.3px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background 0.2s",
            }}
          >
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                  </path>
                </svg>
                Signing in…
              </>
            ) : "Sign In"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "#3A3835" }} />
            <span style={{ fontSize: 12, color: "#6A6560" }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "#3A3835" }} />
          </div>

          {/* Social */}
          <div style={{ display: "flex", gap: 10 }}>
            {["Google", "Apple"].map(s => (
              <button
                key={s}
                onClick={() => { onLogin(`user@${s.toLowerCase()}.com`); onNavigate("discover"); }}
                style={{
                  flex: 1, background: "#242220", border: "1px solid #3A3835", borderRadius: 10,
                  padding: 12, fontSize: 13, color: "#9A9590", cursor: "pointer",
                  fontFamily: "inherit", fontWeight: 500, transition: "border-color 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: "#6A6560", paddingBottom: 24 }}>
            Don't have an account?{" "}
            <span style={{ color: "#C8A96E", fontWeight: 500, cursor: "pointer" }}>Sign up free</span>
          </p>
        </div>
      </div>
    </div>
  );
};
