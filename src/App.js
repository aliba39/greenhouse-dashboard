import React, { useEffect, useState, useMemo } from "react";
import mqtt from "mqtt";
import { motion, AnimatePresence } from "framer-motion";

import logo from "./assets/logo.png";

import {
  FaTemperatureHigh,
  FaTint,
  FaLeaf,
  FaExclamationTriangle,
  FaSignOutAlt,
  FaSeedling,
  FaChartLine,
  FaMicrochip,
  FaSlidersH,
  FaCreditCard,
  FaBars,
  FaMoon,
  FaSun,
  FaWifi,
  FaCalendarAlt,
  FaChevronLeft,
} from "react-icons/fa";

import {
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const MQTT_URL = "ws://localhost:9001";

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "dashboard",    label: "Dashboard",    icon: <FaChartLine /> },
  { key: "analytics",   label: "Analytics",    icon: <FaChartLine /> },
  { key: "sensors",     label: "Sensors",      icon: <FaMicrochip /> },
  { key: "controls",    label: "Controls",     icon: <FaSlidersH /> },
  { key: "plants",      label: "Plants",       icon: <FaSeedling /> },
  { key: "subscription",label: "Subscription", icon: <FaCreditCard /> },
];

// ─── DATE RANGE OPTIONS ───────────────────────────────────────────────────────
const RANGE_OPTIONS = [
  { label: "1 Hour", value: "1h",     ms: 60 * 60 * 1000 },
  { label: "1 Day",  value: "1d",     ms: 24 * 60 * 60 * 1000 },
  { label: "1 Week", value: "1w",     ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "Custom", value: "custom", ms: null },
];

// ─── THEME FACTORY ────────────────────────────────────────────────────────────
const makeTheme = (dark) => ({
  isDark:        dark,
  bg:            dark ? "#0b1120"                  : "#f0f4f8",
  surface:       dark ? "rgba(255,255,255,0.05)"   : "rgba(255,255,255,0.92)",
  border:        dark ? "rgba(255,255,255,0.08)"   : "rgba(0,0,0,0.07)",
  text:          dark ? "#e8f0fe"                  : "#0f172a",
  textMuted:     dark ? "rgba(232,240,254,0.45)"   : "rgba(15,23,42,0.45)",
  sidebar:       dark ? "#0d1526"                  : "#ffffff",
  sidebarBorder: dark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.08)",
  chartGrid:     dark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.07)",
  tooltipBg:     dark ? "#0f172a"                  : "#ffffff",
  inputBg:       dark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.05)",
  inputBorder:   dark ? "rgba(255,255,255,0.12)"   : "rgba(0,0,0,0.12)",
  topbar:        dark ? "rgba(11,17,32,0.9)"       : "rgba(240,244,248,0.9)",
});

const card = (t) => ({
  background:     t.surface,
  borderRadius:   20,
  padding:        20,
  border:         `1px solid ${t.border}`,
  boxShadow:      t.isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.07)",
  backdropFilter: "blur(16px)",
});

const SIDEBAR_FULL      = 240;
const SIDEBAR_COLLAPSED = 72;

// ═══════════════════════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [darkMode,        setDarkMode]        = useState(true);
  const [sidebarOpen,     setSidebarOpen]     = useState(true);
  const [isMobile,        setIsMobile]        = useState(false);
  const [showLogin,       setShowLogin]       = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubscribed,    setIsSubscribed]    = useState(false);
  const [loginData,       setLoginData]       = useState({ username: "", password: "" });
  const [loginError,      setLoginError]      = useState("");
  const [mqttClient,      setMqttClient]      = useState(null);
  const [connected,       setConnected]       = useState(false);
  const [history,         setHistory]         = useState([]);
  const [activePage,      setActivePage]      = useState("dashboard");
  const [timeNow,         setTimeNow]         = useState(new Date());
  const [rangeOption,     setRangeOption]     = useState("1h");
  const [customFrom,      setCustomFrom]      = useState("");
  const [customTo,        setCustomTo]        = useState("");
  const [showCustom,      setShowCustom]      = useState(false);

  const [data, setData] = useState({
    tempInside: 0, humInside: 0, tempOutside: 0, humOutside: 0, soil: 0,
    exhaustFan: "OFF", intakeFan: "OFF", window: "CLOSE", pump: "OFF", mode: "AUTO",
  });

  const theme = makeTheme(darkMode);

  // ── responsive ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── clock ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTimeNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── MQTT (only after auth) ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const c = mqtt.connect(MQTT_URL);
    c.on("connect", () => { setConnected(true);  c.subscribe("greenhouse/#"); });
    c.on("offline", () => setConnected(false));
    c.on("error",   () => setConnected(false));
    c.on("message", (topic, msg) => {
      const value = msg.toString();
      setData((prev) => {
        const updated = {
          ...prev,
          ...(topic === "greenhouse/tempInside"  && { tempInside:  Number(value) }),
          ...(topic === "greenhouse/humInside"   && { humInside:   Number(value) }),
          ...(topic === "greenhouse/tempOutside" && { tempOutside: Number(value) }),
          ...(topic === "greenhouse/humOutside"  && { humOutside:  Number(value) }),
          ...(topic === "greenhouse/soil"        && {
            soil: Math.max(0, Math.min(100, Math.round(((4095 - Number(value)) / 4095) * 100))),
          }),
          ...(topic === "greenhouse/exhaustFan"  && { exhaustFan: value }),
          ...(topic === "greenhouse/intakeFan"   && { intakeFan:  value }),
          ...(topic === "greenhouse/window"      && { window:     value }),
          ...(topic === "greenhouse/pump"        && { pump:       value }),
          ...(topic === "greenhouse/mode"        && { mode:       value }),
        };
        setHistory((h) => [...h.slice(-2000), {
          ts:          Date.now(),
          time:        new Date().toLocaleTimeString(),
          tempInside:  updated.tempInside,
          humInside:   updated.humInside,
          tempOutside: updated.tempOutside,
          humOutside:  updated.humOutside,
          soil:        updated.soil,
        }]);
        return updated;
      });
    });
    setMqttClient(c);
    return () => c.end();
  }, [isAuthenticated]);

  // ── filtered history ─────────────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    if (rangeOption === "custom") {
      const from = customFrom ? new Date(customFrom).getTime() : 0;
      const to   = customTo   ? new Date(customTo).getTime()   : Date.now();
      return history.filter((h) => h.ts >= from && h.ts <= to);
    }
    const opt = RANGE_OPTIONS.find((r) => r.value === rangeOption);
    if (!opt || !opt.ms) return history;
    const cutoff = Date.now() - opt.ms;
    return history.filter((h) => h.ts >= cutoff);
  }, [history, rangeOption, customFrom, customTo]);

  // ── send ─────────────────────────────────────────────────────────────────
  const send = (topic, msg) => {
    if (mqttClient && connected) { mqttClient.publish(topic, msg); return true; }
    return false;
  };

  const emergencyStop = () => {
    send("greenhouse/control/mode", "MANUAL");
    setTimeout(() => {
      send("greenhouse/control/exhaustFan", "OFF");
      send("greenhouse/control/intakeFan",  "OFF");
      send("greenhouse/control/pump",       "OFF");
      send("greenhouse/control/window",     "CLOSE");
    }, 300);
    setData((p) => ({ ...p, mode: "MANUAL", exhaustFan: "OFF", intakeFan: "OFF", pump: "OFF", window: "CLOSE" }));
  };

  const logout = () => {
    setIsAuthenticated(false); setShowLogin(false);
    setConnected(false); setHistory([]);
  };

  const navigate = (page) => {
    setActivePage(page);
    if (isMobile) setSidebarOpen(false);
  };

  const sidebarW = isMobile ? (sidebarOpen ? SIDEBAR_FULL : 0) : (sidebarOpen ? SIDEBAR_FULL : SIDEBAR_COLLAPSED);

  // ══════════════════════════════════════════════════════════════════════════
  //  LANDING PAGE
  // ══════════════════════════════════════════════════════════════════════════
  if (!showLogin && !isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#060e1f,#0b1a35,#091428)", color: "#fff", fontFamily: "'Segoe UI',sans-serif" }}>
        {/* topbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 40px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={logo} alt="logo" style={{ width: 50 }} />
            <span style={{ fontSize: 22, fontWeight: 800 }}>GreenSense</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setDarkMode(!darkMode)} style={sGhostBtn}>{darkMode ? <FaSun /> : <FaMoon />}</button>
            <button onClick={() => setShowLogin(true)} style={sGreenBtn}>Login</button>
          </div>
        </div>
        {/* hero */}
        <div style={{ padding: "80px 40px 50px", textAlign: "center" }}>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: "clamp(32px,6vw,68px)", fontWeight: 900, lineHeight: 1.1 }}>
            Smart Greenhouse<br />Monitoring Platform
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} transition={{ delay: 0.25 }} style={{ marginTop: 20, fontSize: "clamp(15px,2vw,20px)", maxWidth: 760, marginInline: "auto" }}>
            Real-time monitoring and automation for intelligent agriculture, smart irrigation, AI control and cloud analytics.
          </motion.p>
          <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
            onClick={() => setShowLogin(true)} style={{ ...sGreenBtn, marginTop: 32, padding: "15px 36px", fontSize: 16 }}>
            Get Started →
          </motion.button>
        </div>
        {/* services */}
        <div style={{ padding: "30px 40px" }}>
          <h2 style={{ fontWeight: 700, marginBottom: 20 }}>🌿 Our Services</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 18 }}>
            {["Real-time Monitoring","AI Automation","Smart Irrigation","Cloud Analytics","MQTT Integration","Remote Control"].map((s) => (
              <motion.div whileHover={{ scale: 1.03, y: -4 }} key={s}
                style={{ background: "rgba(255,255,255,0.05)", padding: 24, borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)" }}>
                <h3 style={{ marginBottom: 8, fontSize: 16 }}>{s}</h3>
                <p style={{ opacity: 0.65, fontSize: 13 }}>Advanced greenhouse technologies for modern farming and smart agriculture.</p>
              </motion.div>
            ))}
          </div>
        </div>
        {/* plans */}
        <div style={{ padding: "40px 40px 80px" }}>
          <h2 style={{ fontWeight: 700, marginBottom: 20 }}>💳 Subscription Plans</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
            {[{ name:"Basic",price:"$9",color:"#38bdf8" },{ name:"Pro",price:"$19",color:"#22c55e" },{ name:"Enterprise",price:"$49",color:"#f59e0b" }].map((p) => (
              <motion.div whileHover={{ scale: 1.03 }} key={p.name}
                style={{ background: "rgba(255,255,255,0.05)", padding: 28, borderRadius: 22, borderTop: `4px solid ${p.color}` }}>
                <h3 style={{ color: p.color, fontSize: 18, fontWeight: 800 }}>{p.name}</h3>
                <div style={{ fontSize: 34, fontWeight: 900, margin: "10px 0" }}>{p.price}<span style={{ fontSize: 14, opacity: 0.5 }}>/mo</span></div>
                {["Real-time Monitoring","AI Automation","Analytics","Smart Alerts"].map((f) => <p key={f} style={{ fontSize: 13, marginTop: 5, opacity: 0.75 }}>✔ {f}</p>)}
                <button onClick={() => setShowLogin(true)} style={{ ...sGreenBtn, marginTop: 18, width: "100%", background: p.color }}>Subscribe</button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  LOGIN PAGE
  // ══════════════════════════════════════════════════════════════════════════
  if (showLogin && !isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg,#060e1f,#0b1a35)", fontFamily: "'Segoe UI',sans-serif" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: "min(420px,92vw)", background: "rgba(255,255,255,0.07)", padding: 40, borderRadius: 28, backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img src={logo} alt="logo" style={{ width: 72, marginBottom: 14 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Welcome Back</h1>
            <p style={{ opacity: 0.55, marginTop: 4, fontSize: 14 }}>Login to continue</p>
          </div>
          {["username","password"].map((field, i) => (
            <input key={field} type={field === "password" ? "password" : "text"}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={loginData[field]}
              onChange={(e) => setLoginData({ ...loginData, [field]: e.target.value })}
              style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.07)", color: "#fff", outline: "none", fontSize: 15,
                boxSizing: "border-box", marginTop: i === 0 ? 0 : 14 }} />
          ))}
          {loginError && <p style={{ color: "#f87171", marginTop: 10, fontSize: 13 }}>{loginError}</p>}
          <button onClick={() => {
            if (loginData.username === "admin" && loginData.password === "admin123") {
              setIsAuthenticated(true); setIsSubscribed(true); setLoginError("");
            } else setLoginError("Invalid username or password");
          }} style={{ ...sGreenBtn, width: "100%", marginTop: 20, padding: 15, fontSize: 15 }}>LOGIN</button>
          <button onClick={() => setShowLogin(false)} style={{ ...sGhostBtn, width: "100%", marginTop: 12, padding: 15 }}>← Back</button>
        </motion.div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MAIN APP
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "'Segoe UI',sans-serif", position: "relative", overflowX: "hidden" }}>

      {/* ── MOBILE OVERLAY ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 40, backdropFilter: "blur(3px)" }} />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <div style={{
        position:    "fixed",
        top: 0, left: 0, bottom: 0,
        width:       sidebarW,
        background:  theme.sidebar,
        borderRight: `1px solid ${theme.sidebarBorder}`,
        display:     "flex",
        flexDirection: "column",
        zIndex:      50,
        overflow:    "hidden",
        transition:  "width 0.28s cubic-bezier(.4,0,.2,1)",
        boxShadow:   theme.isDark ? "4px 0 24px rgba(0,0,0,0.35)" : "4px 0 20px rgba(0,0,0,0.06)",
      }}>
        {/* logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 16px 16px", borderBottom: `1px solid ${theme.sidebarBorder}`, minHeight: 68, overflow: "hidden" }}>
          <img src={logo} alt="logo" style={{ width: 34, flexShrink: 0 }} />
          {sidebarW >= SIDEBAR_FULL && (
            <span style={{ fontWeight: 800, fontSize: 17, whiteSpace: "nowrap", color: theme.text, opacity: sidebarW >= SIDEBAR_FULL ? 1 : 0, transition: "opacity 0.2s" }}>
              GreenSense
            </span>
          )}
        </div>

        {/* nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {NAV_ITEMS.map((item) => {
            const active = activePage === item.key;
            return (
              <motion.button key={item.key} whileHover={{ x: 3 }} onClick={() => navigate(item.key)} title={item.label}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", padding: "11px 12px", marginBottom: 3,
                  borderRadius: 13, border: "none", cursor: "pointer", textAlign: "left",
                  whiteSpace: "nowrap", overflow: "hidden",
                  background: active ? (theme.isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.1)") : "transparent",
                  color:      active ? "#22c55e" : theme.textMuted,
                  fontWeight: active ? 700 : 500, fontSize: 14,
                  borderLeft: `3px solid ${active ? "#22c55e" : "transparent"}`,
                  transition: "background 0.18s, color 0.18s",
                }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {sidebarW >= SIDEBAR_FULL && <span>{item.label}</span>}
              </motion.button>
            );
          })}
        </nav>

        {/* footer */}
        <div style={{ padding: "12px 8px", borderTop: `1px solid ${theme.sidebarBorder}` }}>
          {/* connection */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: connected ? "#22c55e" : "#ef4444",
              boxShadow:  connected ? "0 0 6px #22c55e" : "0 0 6px #ef4444" }} />
            {sidebarW >= SIDEBAR_FULL && <span style={{ fontSize: 12, color: theme.textMuted, whiteSpace: "nowrap" }}>{connected ? "MQTT Connected" : "Disconnected"}</span>}
          </div>
          {/* theme toggle */}
          <button onClick={() => setDarkMode(!darkMode)} title="Toggle theme"
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 11, border: "none", background: "transparent", color: theme.textMuted, cursor: "pointer", fontSize: 13 }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>{darkMode ? <FaSun /> : <FaMoon />}</span>
            {sidebarW >= SIDEBAR_FULL && <span style={{ whiteSpace: "nowrap" }}>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          {/* logout */}
          <button onClick={logout} title="Logout"
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 11, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 13 }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}><FaSignOutAlt /></span>
            {sidebarW >= SIDEBAR_FULL && <span style={{ whiteSpace: "nowrap" }}>Logout</span>}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, marginLeft: isMobile ? 0 : sidebarW, transition: "margin-left 0.28s cubic-bezier(.4,0,.2,1)", minWidth: 0 }}>

        {/* ── TOPBAR ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 30,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", height: 62,
          background: theme.topbar,
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${theme.border}`,
        }}>
          {/* hamburger */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: "transparent", border: "none", color: theme.text, fontSize: 18, cursor: "pointer", padding: 8, borderRadius: 10, display: "flex", alignItems: "center" }}>
            {sidebarOpen && !isMobile ? <FaChevronLeft /> : <FaBars />}
          </button>

          {/* page title */}
          <h2 style={{ fontWeight: 800, fontSize: 17, margin: 0, flex: 1, paddingLeft: 10 }}>
            {NAV_ITEMS.find((n) => n.key === activePage)?.label}
          </h2>

          {/* right info */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: theme.textMuted }}>
            <span style={{ display: isMobile ? "none" : "block" }}>{timeNow.toLocaleTimeString()}</span>
            <FaWifi style={{ color: connected ? "#22c55e" : "#ef4444", fontSize: 15 }} />
          </div>
        </div>

        {/* ── PAGE BODY ── */}
        <div style={{ padding: "22px 18px", maxWidth: 1400, margin: "0 auto" }}>

          {/* ── DATE RANGE PICKER (dashboard & analytics) ── */}
          {(activePage === "dashboard" || activePage === "analytics") && isSubscribed && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {RANGE_OPTIONS.map((opt) => (
                  <button key={opt.value}
                    onClick={() => {
                      setRangeOption(opt.value);
                      setShowCustom(opt.value === "custom");
                    }}
                    style={{
                      padding: "7px 15px", borderRadius: 10, cursor: "pointer",
                      fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 5,
                      background: rangeOption === opt.value ? "#22c55e"  : theme.surface,
                      color:      rangeOption === opt.value ? "#fff"     : theme.textMuted,
                      border:     `1px solid ${rangeOption === opt.value ? "#22c55e" : theme.border}`,
                      transition: "all 0.15s",
                    }}>
                    {opt.value === "custom" && <FaCalendarAlt style={{ fontSize: 11 }} />}
                    {opt.label}
                  </button>
                ))}
                <span style={{ fontSize: 12, color: theme.textMuted }}>
                  {filteredHistory.length} pts
                </span>
              </div>

              {/* custom range inputs */}
              <AnimatePresence>
                {showCustom && rangeOption === "custom" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}>
                    <div style={{ ...card(theme), marginTop: 12, padding: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div>
                        <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 5 }}>From</label>
                        <input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                          style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, outline: "none", fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 5 }}>To</label>
                        <input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                          style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, outline: "none", fontSize: 13 }} />
                      </div>
                      <button onClick={() => setShowCustom(false)} style={{ ...sGreenBtn, padding: "10px 18px", fontSize: 13 }}>Apply</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {activePage === "dashboard" && isSubscribed && (
            <>
              <div style={rGrid}>
                <StatCard title="Inside Temp"     value={`${data.tempInside}°C`} color="#22c55e" icon={<FaTemperatureHigh />} theme={theme} />
                <StatCard title="Inside Humidity" value={`${data.humInside}%`}   color="#38bdf8" icon={<FaTint />}           theme={theme} />
                <StatCard title="Soil Moisture"   value={`${data.soil}%`}        color="#facc15" icon={<FaLeaf />}           theme={theme} />
              </div>
              <div style={rChartGrid}>
                <SmoothChart title="Temperature °C"  dataKey="tempInside" color="#22c55e" data={filteredHistory} theme={theme} />
                <SmoothChart title="Humidity %"      dataKey="humInside"  color="#38bdf8" data={filteredHistory} theme={theme} />
                <SmoothChart title="Soil Moisture %"  dataKey="soil"       color="#facc15" data={filteredHistory} theme={theme} />
              </div>
            </>
          )}

          {activePage === "dashboard" && !isSubscribed && (
            <div style={{ ...card(theme), textAlign: "center", padding: 50 }}>
              <div style={{ fontSize: 46 }}>🔒</div>
              <h2 style={{ marginTop: 14 }}>Dashboard Locked</h2>
              <p style={{ color: theme.textMuted, marginTop: 8 }}>Subscribe to access live charts and sensor data.</p>
              <button onClick={() => navigate("subscription")} style={{ ...sGreenBtn, marginTop: 18 }}>View Plans</button>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activePage === "analytics" && (
            <div style={rChartGrid}>
              <SmoothChart title="Inside Temp °C"    dataKey="tempInside"  color="#22c55e" data={filteredHistory} theme={theme} />
              <SmoothChart title="Inside Humidity %"  dataKey="humInside"   color="#38bdf8" data={filteredHistory} theme={theme} />
              <SmoothChart title="Outside Temp °C"   dataKey="tempOutside" color="#f97316" data={filteredHistory} theme={theme} />
              <SmoothChart title="Outside Humidity %" dataKey="humOutside"  color="#06b6d4" data={filteredHistory} theme={theme} />
            </div>
          )}

          {/* ── SENSORS ── */}
          {activePage === "sensors" && (
            <div style={rGrid}>
              <StatCard title="Inside Temp"      value={`${data.tempInside}°C`}  color="#22c55e" icon={<FaTemperatureHigh />} theme={theme} />
              <StatCard title="Inside Humidity"  value={`${data.humInside}%`}    color="#38bdf8" icon={<FaTint />}           theme={theme} />
              <StatCard title="Outside Temp"     value={`${data.tempOutside}°C`} color="#f97316" icon={<FaTemperatureHigh />} theme={theme} />
              <StatCard title="Outside Humidity" value={`${data.humOutside}%`}   color="#06b6d4" icon={<FaTint />}           theme={theme} />
              <StatCard title="Soil Moisture"    value={`${data.soil}%`}         color="#facc15" icon={<FaLeaf />}           theme={theme} />
            </div>
          )}

          {/* ── CONTROLS ── */}
          {activePage === "controls" && (
            <>
              <div style={{ ...card(theme), marginBottom: 18 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>⚙ System Mode</h3>
                <div style={{ fontSize: 26, fontWeight: 900, color: data.mode === "AUTO" ? "#22c55e" : "#3b82f6", marginBottom: 14 }}>{data.mode}</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {["AUTO","MANUAL"].map((m) => (
                    <button key={m} onClick={() => { send("greenhouse/control/mode", m); setData((p) => ({ ...p, mode: m })); }}
                      style={{ padding: "10px 22px", borderRadius: 12, border: `1px solid ${theme.border}`, fontWeight: 700, cursor: "pointer", fontSize: 14,
                        background: data.mode === m ? (m === "AUTO" ? "#22c55e" : "#3b82f6") : theme.surface,
                        color: data.mode === m ? "#fff" : theme.textMuted }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={emergencyStop}
                style={{ width: "100%", padding: 17, border: "none", borderRadius: 16, background: "linear-gradient(90deg,#ef4444,#dc2626)", color: "#fff", fontSize: 17, fontWeight: 800, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <FaExclamationTriangle /> EMERGENCY STOP
              </motion.button>

              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>🎛 Control Panel</h3>
              <div style={rGrid}>
                {[
                  { label: "Exhaust Fan", key: "exhaustFan", topic: "greenhouse/control/fan", onVal: "ON",   offVal: "OFF"   },
                  { label: "Intake Fan",  key: "intakeFan",  topic: "greenhouse/control/intakeFan",  onVal: "ON",   offVal: "OFF"   },
                  { label: "Window",      key: "window",     topic: "greenhouse/control/window",      onVal: "OPEN", offVal: "CLOSE" },
                  { label: "Pump",        key: "pump",       topic: "greenhouse/control/pump",        onVal: "ON",   offVal: "OFF"   },
                ].map(({ label, key, topic, onVal, offVal }) => (
                  <Toggle key={key} label={label} disabled={data.mode === "AUTO"}
                    state={data[key] === onVal}
                    onToggle={(v) => { setData((p) => ({ ...p, [key]: v ? onVal : offVal })); send(topic, v ? onVal : offVal); }}
                    theme={theme} />
                ))}
              </div>
            </>
          )}

          {/* ── PLANTS ── */}
          {activePage === "plants" && (
            <div style={rGrid}>
              {[
                { name:"Tomato",   emoji:"🍅", temp:"20–28°C", hum:"60–80%", soil:"50–70%" },
                { name:"Lettuce",  emoji:"🥬", temp:"15–22°C", hum:"50–70%", soil:"60–80%" },
                { name:"Pepper",   emoji:"🌶", temp:"21–29°C", hum:"55–75%", soil:"45–65%" },
                { name:"Cucumber", emoji:"🥒", temp:"22–30°C", hum:"65–85%", soil:"55–75%" },
              ].map((plant) => (
                <motion.div whileHover={{ scale: 1.02, y: -4 }} key={plant.name} style={card(theme)}>
                  <div style={{ fontSize: 34, marginBottom: 8 }}>{plant.emoji}</div>
                  <h3 style={{ fontWeight: 800, marginBottom: 12 }}>{plant.name}</h3>
                  <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 5 }}>🌡 Ideal Temp: <strong style={{ color: theme.text }}>{plant.temp}</strong></p>
                  <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 5 }}>💧 Humidity: <strong style={{ color: theme.text }}>{plant.hum}</strong></p>
                  <p style={{ fontSize: 13, color: theme.textMuted }}>🌱 Soil: <strong style={{ color: theme.text }}>{plant.soil}</strong></p>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── SUBSCRIPTION ── */}
          {activePage === "subscription" && (
            <div style={rGrid}>
              {[{ name:"Basic",price:"$9",color:"#38bdf8" },{ name:"Pro",price:"$19",color:"#22c55e" },{ name:"Enterprise",price:"$49",color:"#f59e0b" }].map((plan) => (
                <motion.div whileHover={{ scale: 1.02 }} key={plan.name} style={{ ...card(theme), borderTop: `4px solid ${plan.color}` }}>
                  <h3 style={{ color: plan.color, fontSize: 18, fontWeight: 800 }}>{plan.name}</h3>
                  <div style={{ fontSize: 32, fontWeight: 900, margin: "10px 0" }}>{plan.price}<span style={{ fontSize: 14, opacity: 0.5 }}>/mo</span></div>
                  {["Real-time Monitoring","AI Automation","Analytics","Smart Alerts"].map((f) => <p key={f} style={{ fontSize: 13, marginTop: 5, color: theme.textMuted }}>✔ {f}</p>)}
                  <button onClick={() => { setIsSubscribed(true); alert(`${plan.name} Plan Activated`); }}
                    style={{ ...sGreenBtn, marginTop: 18, width: "100%", background: plan.color }}>Subscribe</button>
                </motion.div>
              ))}
            </div>
          )}

        </div>{/* end body */}
      </div>{/* end main */}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ title, value, icon, color, theme }) {
  return (
    <motion.div whileHover={{ scale: 1.03, y: -3 }}
      style={{ ...card(theme), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>{title}</p>
        <h2 style={{ fontSize: 28, fontWeight: 900, color }}>{value}</h2>
      </div>
      <div style={{ fontSize: 36, color, opacity: 0.85 }}>{icon}</div>
    </motion.div>
  );
}

function Toggle({ label, state, onToggle, disabled, theme }) {
  const activeColor = state ? "#22c55e" : "#ef4444";
  return (
    <motion.div whileHover={{ scale: disabled ? 1 : 1.02 }}
      style={{ ...card(theme), opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h4 style={{ fontWeight: 700, margin: 0 }}>{label}</h4>
        {disabled && <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "rgba(59,130,246,0.18)", color: "#3b82f6", fontWeight: 700 }}>AUTO</span>}
      </div>
      <div onClick={() => onToggle(!state)}
        style={{ width: 66, height: 33, borderRadius: 50, background: activeColor, position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
        <motion.div animate={{ x: state ? 33 : 0 }} transition={{ duration: 0.18 }}
          style={{ width: 27, height: 27, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: 3 }} />
      </div>
      <p style={{ marginTop: 10, fontWeight: 700, fontSize: 14, color: activeColor }}>{state ? "ON" : "OFF"}</p>
    </motion.div>
  );
}

function SmoothChart({ title, dataKey, data, color, theme }) {
  const gradId = `grad_${dataKey}`;
  return (
    <motion.div whileHover={{ scale: 1.01 }} style={card(theme)}>
      <h4 style={{ fontWeight: 700, marginBottom: 14, margin: "0 0 14px" }}>{title}</h4>
      {data.length === 0
        ? <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMuted, fontSize: 13 }}>No data for selected range</div>
        : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: theme.textMuted }} />
              <YAxis tick={{ fontSize: 10, fill: theme.textMuted }} />
              <Tooltip contentStyle={{ background: theme.tooltipBg, border: "none", borderRadius: 10, color: theme.text, fontSize: 12 }} />
              <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#${gradId})`} strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
    </motion.div>
  );
}

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const sGreenBtn = {
  padding: "10px 20px", border: "none", borderRadius: 11,
  background: "linear-gradient(90deg,#22c55e,#16a34a)",
  color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
};

const sGhostBtn = {
  padding: "10px 16px", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 11, background: "rgba(255,255,255,0.06)",
  color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14,
};

const rGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 14,
  marginBottom: 8,
};

const rChartGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
  gap: 14,
  marginTop: 8,
};
