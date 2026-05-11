import React, { useEffect, useState } from "react";
import mqtt from "mqtt";
import { motion } from "framer-motion";

import logo from "./assets/logo.png";

import {
  FaTemperatureHigh,
  FaTint,
  FaLeaf,
  FaWater,
  FaClock,
  FaChartLine,
  FaHome,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const MQTT_URL = "ws://localhost:9001";

// ================= THEMES =================

const dark = {
  container: (sidebarOpen) => ({
    background:
      "linear-gradient(135deg,#0f172a,#111827,#020617)",

    color: "#f8fafc",

    minHeight: "100vh",

    padding: "20px",

    paddingLeft: sidebarOpen
      ? "240px"
      : "110px",

    fontFamily: "Segoe UI",

    position: "relative",

    overflowX: "hidden",

    transition: "all 0.3s ease",
  }),

  sidebar: {
    background:
      "rgba(15,23,42,0.88)",

    borderRight:
      "1px solid rgba(255,255,255,0.08)",

    backdropFilter: "blur(18px)",
  },

  card: {
    background:
      "rgba(255,255,255,0.06)",

    borderRadius: 24,

    padding: 20,

    boxShadow:
      "0 8px 30px rgba(0,0,0,0.35)",

    backdropFilter: "blur(18px)",

    border:
      "1px solid rgba(255,255,255,0.08)",

    transition: "0.3s",
  },

  grid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",

    gap: 20,

    marginTop: 20,
  },

  chartGrid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit,minmax(340px,1fr))",

    gap: 20,

    marginTop: 30,
  },

  chartGridColor:
    "rgba(255,255,255,0.08)",

  tooltipBg: "#0f172a",

  tooltipText: "#fff",
};

const light = {
  container: (sidebarOpen) => ({
    background:
      "linear-gradient(135deg,#f8fafc,#e2e8f0,#cbd5e1)",

    color: "#0f172a",

    minHeight: "100vh",

    padding: "20px",

    paddingLeft: sidebarOpen
      ? "240px"
      : "110px",

    fontFamily: "Segoe UI",

    position: "relative",

    overflowX: "hidden",

    transition: "all 0.3s ease",
  }),

  sidebar: {
    background:
      "rgba(255,255,255,0.9)",

    borderRight:
      "1px solid rgba(0,0,0,0.08)",

    backdropFilter: "blur(16px)",
  },

  card: {
    background:
      "rgba(255,255,255,0.9)",

    borderRadius: 24,

    padding: 20,

    boxShadow:
      "0 6px 20px rgba(0,0,0,0.08)",

    border:
      "1px solid rgba(0,0,0,0.05)",

    transition: "0.3s",
  },

  grid: dark.grid,

  chartGrid: dark.chartGrid,

  chartGridColor:
    "rgba(0,0,0,0.08)",

  tooltipBg: "#ffffff",

  tooltipText: "#0f172a",
};

// ================= APP =================

function App() {
  const [client, setClient] =
    useState(null);

  const [connected, setConnected] =
    useState(false);

  const [darkMode, setDarkMode] =
    useState(true);

  const [history, setHistory] =
    useState([]);

  const [activePage, setActivePage] =
    useState("dashboard");

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [data, setData] = useState({
    temp: 0,
    hum: 0,
    soil: 0,

    fan: "OFF",
    window: "CLOSE",
    pump: "OFF",

    mode: "AUTO",
  });

  const theme = darkMode
    ? dark
    : light;

  // ================= MQTT =================

  useEffect(() => {
    const mqttClient =
      mqtt.connect(MQTT_URL);

    mqttClient.on("connect", () => {
      setConnected(true);

      mqttClient.subscribe(
        "greenhouse/#"
      );
    });

    mqttClient.on("offline", () => {
      setConnected(false);
    });

    mqttClient.on(
      "message",
      (topic, msg) => {
        const value = msg.toString();

        setData((prev) => ({
          ...prev,

          ...(topic ===
            "greenhouse/temp" && {
            temp: Number(value),
          }),

          ...(topic ===
            "greenhouse/hum" && {
            hum: Number(value),
          }),

          ...(topic ===
            "greenhouse/soil" && {
            soil: Math.max(
              0,
              Math.min(
                100,

                Math.round(
                  ((4095 -
                    Number(value)) /
                    4095) *
                    100
                )
              )
            ),
          }),

          ...(topic ===
            "greenhouse/fan" && {
            fan: value,
          }),

          ...(topic ===
            "greenhouse/window" && {
            window: value,
          }),

          ...(topic ===
            "greenhouse/pump" && {
            pump: value,
          }),

          ...(topic ===
            "greenhouse/mode" && {
            mode: value,
          }),
        }));

        // HISTORY

        if (
          topic.includes("temp") ||
          topic.includes("hum") ||
          topic.includes("soil")
        ) {
          setHistory((prev) => {
            const last =
              prev[prev.length - 1] || {};

            return [
              ...prev.slice(-120),

              {
                time:
                  new Date().toLocaleTimeString(),

                temp:
                  topic ===
                  "greenhouse/temp"
                    ? Number(value)
                    : last.temp || 0,

                hum:
                  topic ===
                  "greenhouse/hum"
                    ? Number(value)
                    : last.hum || 0,

                soil:
                  topic ===
                  "greenhouse/soil"
                    ? Math.round(
                        ((4095 -
                          Number(value)) /
                          4095) *
                          100
                      )
                    : last.soil || 0,
              },
            ];
          });
        }
      }
    );

    setClient(mqttClient);

    return () => mqttClient.end();
  }, []);

  // ================= SEND =================

  const send = (topic, msg) => {
    if (client && connected) {
      client.publish(topic, msg);
    }
  };

  // ================= EMERGENCY =================

  const emergencyStop = () => {

    send(
      "greenhouse/control/mode",
      "MANUAL"
    );

    setTimeout(() => {

      send(
        "greenhouse/control/fan",
        "OFF"
      );

      send(
        "greenhouse/control/pump",
        "OFF"
      );

      send(
        "greenhouse/control/window",
        "CLOSE"
      );

    }, 300);
  };

  // ================= ALERTS =================

  const alerts = [];

  if (data.temp >= 40) {
    alerts.push({
      color: "#ef4444",
      text: "🚨 Critical Temperature",
    });
  }

  if (data.hum <= 30) {
    alerts.push({
      color: "#f59e0b",
      text: "⚠ Low Humidity",
    });
  }

  if (data.soil <= 20) {
    alerts.push({
      color: "#eab308",
      text: "🌱 Soil Moisture Low",
    });
  }

  return (
    <div
      style={theme.container(
        sidebarOpen
      )}
    >
      {/* SIDEBAR */}

      <div
        style={{
          position: "fixed",

          left: 0,

          top: 0,

          width: sidebarOpen
            ? 220
            : 90,

          height: "100vh",

          ...theme.sidebar,

          display: "flex",

          flexDirection: "column",

          paddingTop: 20,

          transition: "0.3s",

          zIndex: 1000,
        }}
      >
        <div
          style={{
            display: "flex",

            justifyContent:
              sidebarOpen
                ? "space-between"
                : "center",

            alignItems: "center",

            padding: "0 20px",
          }}
        >
          {sidebarOpen && (
            <h2>GreenSense</h2>
          )}

          <div
            onClick={() =>
              setSidebarOpen(
                !sidebarOpen
              )
            }
            style={{
              cursor: "pointer",
            }}
          >
            {sidebarOpen ? (
              <FaChevronLeft />
            ) : (
              <FaChevronRight />
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 40,

            display: "flex",

            flexDirection: "column",

            gap: 10,
          }}
        >
          <SidebarItem
            icon={<FaHome />}
            text="Dashboard"
            active={
              activePage ===
              "dashboard"
            }
            open={sidebarOpen}
            onClick={() =>
              setActivePage(
                "dashboard"
              )
            }
          />

          <SidebarItem
            icon={<FaChartLine />}
            text="Analytics"
            active={
              activePage ===
              "analytics"
            }
            open={sidebarOpen}
            onClick={() =>
              setActivePage(
                "analytics"
              )
            }
          />

          <SidebarItem
            icon={<FaLeaf />}
            text="Sensors"
            active={
              activePage ===
              "sensors"
            }
            open={sidebarOpen}
            onClick={() =>
              setActivePage(
                "sensors"
              )
            }
          />

          <SidebarItem
            icon={<FaWater />}
            text="Controls"
            active={
              activePage ===
              "controls"
            }
            open={sidebarOpen}
            onClick={() =>
              setActivePage(
                "controls"
              )
            }
          />
        </div>

        {/* MINI LIVE PREVIEW */}

        {sidebarOpen && (
          <div
            style={{
              marginTop: "auto",

              padding: 20,
            }}
          >
            <div
              style={{
                ...theme.card,
                padding: 16,
              }}
            >
              <h4>
                📡 Live Preview
              </h4>

              <p>
                🌡 {data.temp}°C
              </p>

              <p>
                💧 {data.hum}%
              </p>

              <p>
                🌱 {data.soil}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* HEADER */}

      <div
        style={{
          display: "flex",

          justifyContent:
            "space-between",

          alignItems: "center",

          flexWrap: "wrap",

          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",

            alignItems: "center",

            gap: 15,
          }}
        >
          <img
            src={logo}
            alt="logo"
            style={{
              width: 80,
              height: 80,
            }}
          />

          <div>
            <h1>
              GreenSense
            </h1>

            <div
              style={{
                display: "flex",

                alignItems:
                  "center",

                gap: 10,
              }}
            >
              <div
                style={{
                  width: 14,

                  height: 14,

                  borderRadius:
                    "50%",

                  background:
                    connected
                      ? "#22c55e"
                      : "#ef4444",
                }}
              />

              <span>
                {connected
                  ? "MQTT Connected"
                  : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        {/* CLOCK */}

        <motion.div
          whileHover={{
            scale: 1.03,
          }}
          style={{
            ...theme.card,

            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",

              alignItems:
                "center",

              gap: 10,
            }}
          >
            <FaClock />

            <span>
              {new Date().toLocaleTimeString()}
            </span>
          </div>

          <div
            style={{
              marginTop: 5,
            }}
          >
            {new Date().toLocaleDateString()}
          </div>
        </motion.div>

        {/* THEME BUTTON */}

        <button
          onClick={() =>
            setDarkMode(
              !darkMode
            )
          }
          style={{
            border: "none",

            borderRadius: 14,

            padding:
              "12px 20px",

            cursor: "pointer",

            fontWeight:
              "bold",

            background:
              darkMode
                ? "#fff"
                : "#111",

            color:
              darkMode
                ? "#111"
                : "#fff",
          }}
        >
          {darkMode
            ? "☀ Light"
            : "🌙 Dark"}
        </button>
      </div>

      {/* LIVE STATUS */}

      <div
        style={{
          display: "flex",

          gap: 15,

          marginTop: 25,

          flexWrap: "wrap",
        }}
      >
        <LiveStatus
          label="Fan"
          active={
            data.fan === "ON"
          }
        />

        <LiveStatus
          label="Pump"
          active={
            data.pump === "ON"
          }
        />

        <LiveStatus
          label="Window"
          active={
            data.window ===
            "OPEN"
          }
        />
      </div>

      {/* ALERTS */}

      {alerts.length > 0 && (
        <div
          style={{
            marginTop: 25,

            display: "flex",

            flexDirection:
              "column",

            gap: 12,
          }}
        >
          {alerts.map(
            (alert, index) => (
              <motion.div
                key={index}
                initial={{
                  opacity: 0,
                  y: -10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                style={{
                  background:
                    alert.color,

                  padding: 18,

                  borderRadius: 16,

                  fontWeight:
                    "bold",
                }}
              >
                {alert.text}
              </motion.div>
            )
          )}
        </div>
      )}

      {/* SENSOR CARDS */}

      <div style={theme.grid}>
        <StatCard
          title="Temperature"
          value={`${data.temp}°C`}
          color="#22c55e"
          icon={
            <FaTemperatureHigh />
          }
          theme={theme}
        />

        <StatCard
          title="Humidity"
          value={`${data.hum}%`}
          color="#38bdf8"
          icon={<FaTint />}
          theme={theme}
        />

        <StatCard
          title="Soil"
          value={`${data.soil}%`}
          color="#facc15"
          icon={<FaLeaf />}
          theme={theme}
        />
      </div>

      {/* CHARTS */}

      <div style={theme.chartGrid}>
        <SmoothChart
          title="Temperature"
          dataKey="temp"
          color="#22c55e"
          data={history}
          theme={theme}
        />

        <SmoothChart
          title="Humidity"
          dataKey="hum"
          color="#38bdf8"
          data={history}
          theme={theme}
        />

        <SmoothChart
          title="Soil"
          dataKey="soil"
          color="#facc15"
          data={history}
          theme={theme}
        />
      </div>

      {/* ================= MODE ================= */}

      <div
        style={{
          ...theme.card,

          marginTop: 30,

          display: "flex",

          justifyContent: "space-between",

          alignItems: "center",

          flexWrap: "wrap",

          gap: 20,
        }}
      >
        <div>
          <h2>⚙ System Mode</h2>

          <h1
            style={{
              color:
                data.mode === "AUTO"
                  ? "#22c55e"
                  : "#3b82f6",

              transition: "0.3s",
            }}
          >
            {data.mode}
          </h1>

          <p
            style={{
              opacity: 0.8,

              marginTop: 8,
            }}
          >
            {data.mode === "AUTO"
              ? "ESP32 controls the greenhouse automatically."
              : "Manual control is enabled."}
          </p>
        </div>

        <div
          style={{
            display: "flex",

            gap: 12,

            flexWrap: "wrap",
          }}
        >
          {/* AUTO BUTTON */}

          <button
            onClick={() => {

              send(
                "greenhouse/control/mode",
                "AUTO"
              );

            }}

            style={{
              ...buttonStyle(
                data.mode === "AUTO",
                "#22c55e",
                darkMode
              ),

              minWidth: 120,
            }}
          >
            AUTO
          </button>

          {/* MANUAL BUTTON */}

          <button
            onClick={() => {

              send(
                "greenhouse/control/mode",
                "MANUAL"
              );

            }}

            style={{
              ...buttonStyle(
                data.mode === "MANUAL",
                "#3b82f6",
                darkMode
              ),

              minWidth: 120,
            }}
          >
            MANUAL
          </button>
        </div>
      </div>

      {/* ================= AUTO MODE STATUS ================= */}

      {data.mode === "AUTO" && (

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}

          transition={{
            duration: 0.3,
          }}

          style={{
            ...theme.card,

            marginTop: 20,

            border:
              "1px solid rgba(34,197,94,0.4)",

            background:
              "rgba(34,197,94,0.08)",

            color: "#22c55e",

            textAlign: "center",

            fontWeight: "bold",
          }}
        >
          🤖 AUTO MODE ACTIVE

          <div
            style={{
              marginTop: 10,

              fontSize: 14,

              opacity: 0.85,

              fontWeight: "normal",
            }}
          >
            ESP32 automatically controls:
            Fan, Pump and Window.
          </div>
        </motion.div>

      )}

      {/* ================= MANUAL MODE STATUS ================= */}

      {data.mode === "MANUAL" && (

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}

          transition={{
            duration: 0.3,
          }}

          style={{
            ...theme.card,

            marginTop: 20,

            border:
              "1px solid rgba(59,130,246,0.4)",

            background:
              "rgba(59,130,246,0.08)",

            color: "#3b82f6",

            textAlign: "center",

            fontWeight: "bold",
          }}
        >
          🎛 MANUAL MODE ACTIVE

          <div
            style={{
              marginTop: 10,

              fontSize: 14,

              opacity: 0.85,

              fontWeight: "normal",
            }}
          >
            You can now manually control:
            Fan, Pump and Window.
          </div>
        </motion.div>

      )}

      

      

      {/* EMERGENCY */}

      <motion.button
        whileHover={{
          scale: 1.03,
        }}
        whileTap={{
          scale: 0.95,
        }}
        onClick={emergencyStop}
        style={{
          marginTop: 30,

          width: "100%",

          padding: 20,

          border: "none",

          borderRadius: 20,

          background:
            "linear-gradient(90deg,#ef4444,#dc2626)",

          color: "#fff",

          fontSize: 20,

          fontWeight:
            "bold",

          cursor: "pointer",

          display: "flex",

          justifyContent:
            "center",

          alignItems: "center",

          gap: 12,

          boxShadow:
            "0 10px 30px rgba(239,68,68,0.4)",
        }}
      >
        <FaExclamationTriangle />

        EMERGENCY STOP
      </motion.button>

      {/* CONTROLS */}

      <h2
        style={{
          marginTop: 40,
        }}
      >
        🎛 Control Panel
      </h2>

      <div style={theme.grid}>
        <Toggle
          label="Fan"
          disabled={
            data.mode ===
            "AUTO"
          }
          state={
            data.fan === "ON"
          }
          onToggle={(v) =>
            send(
              "greenhouse/control/fan",
              v
                ? "ON"
                : "OFF"
            )
          }
          theme={theme}
        />

        <Toggle
          label="Window"
          disabled={
            data.mode ===
            "AUTO"
          }
          state={
            data.window ===
            "OPEN"
          }
          onToggle={(v) =>
            send(
              "greenhouse/control/window",
              v
                ? "OPEN"
                : "CLOSE"
            )
          }
          theme={theme}
        />

        <Toggle
          label="Pump"
          disabled={
            data.mode ===
            "AUTO"
          }
          state={
            data.pump ===
            "ON"
          }
          onToggle={(v) =>
            send(
              "greenhouse/control/pump",
              v
                ? "ON"
                : "OFF"
            )
          }
          theme={theme}
        />
      </div>
    </div>
  );
}

// ================= SIDEBAR ITEM =================

function SidebarItem({
  icon,
  text,
  active,
  open,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",

        alignItems: "center",

        gap: 15,

        padding: "14px 20px",

        cursor: "pointer",

        background: active
          ? "rgba(34,197,94,0.2)"
          : "transparent",

        borderLeft: active
          ? "4px solid #22c55e"
          : "4px solid transparent",
      }}
    >
      <div
        style={{
          fontSize: 20,
        }}
      >
        {icon}
      </div>

      {open && <span>{text}</span>}
    </div>
  );
}

// ================= LIVE STATUS =================

function LiveStatus({
  label,
  active,
}) {
  return (
    <div
      style={{
        padding: "12px 18px",

        borderRadius: 14,

        background:
          "rgba(255,255,255,0.08)",

        display: "flex",

        alignItems: "center",

        gap: 10,
      }}
    >
      <div
        style={{
          width: 12,

          height: 12,

          borderRadius: "50%",

          background: active
            ? "#22c55e"
            : "#ef4444",

          boxShadow: active
            ? "0 0 12px #22c55e"
            : "0 0 8px #ef4444",
        }}
      />

      <span>
        {label}:{" "}
        {active ? "ON" : "OFF"}
      </span>
    </div>
  );
}

// ================= STAT CARD =================

function StatCard({
  title,
  value,
  icon,
  color,
  theme,
}) {
  return (
    <motion.div
      whileHover={{
        scale: 1.03,
      }}
      style={{
        ...theme.card,

        display: "flex",

        justifyContent:
          "space-between",

        alignItems: "center",
      }}
    >
      <div>
        <h3>{title}</h3>

        <h1
          style={{
            color,
          }}
        >
          {value}
        </h1>
      </div>

      <div
        style={{
          fontSize: 42,

          color,
        }}
      >
        {icon}
      </div>
    </motion.div>
  );
}

// ================= TOGGLE =================

function Toggle({
  label,
  state,
  onToggle,
  disabled,
  theme,
}) {

  const activeColor =
    state
      ? "#22c55e"
      : "#ef4444";

  return (

    <motion.div
      whileHover={{
        scale:
          disabled ? 1 : 1.03,
      }}

      style={{
        ...theme.card,

        opacity:
          disabled ? 0.55 : 1,

        pointerEvents:
          disabled
            ? "none"
            : "auto",

        transition: "0.3s",
      }}
    >

      <div
        style={{
          display: "flex",

          justifyContent:
            "space-between",

          alignItems: "center",

          marginBottom: 15,
        }}
      >

        <h3>{label}</h3>

        {disabled && (
          <span
            style={{
              fontSize: 12,

              padding:
                "4px 10px",

              borderRadius: 20,

              background:
                "rgba(59,130,246,0.2)",

              color: "#3b82f6",

              fontWeight:
                "bold",
            }}
          >
            AUTO
          </span>
        )}

      </div>

      <div
        onClick={() =>
          onToggle(!state)
        }

        style={{
          width: 72,

          height: 36,

          borderRadius: 50,

          background:
            activeColor,

          position: "relative",

          cursor: "pointer",

          transition: "0.3s",

          boxShadow:
            state
              ? "0 0 20px rgba(34,197,94,0.5)"
              : "0 0 16px rgba(239,68,68,0.3)",
        }}
      >

        <motion.div
          animate={{
            x:
              state ? 36 : 0,
          }}

          transition={{
            duration: 0.2,
          }}

          style={{
            width: 30,

            height: 30,

            borderRadius:
              "50%",

            background:
              "#fff",

            position:
              "absolute",

            top: 3,

            left: 3,
          }}
        />

      </div>

      <p
        style={{
          marginTop: 12,

          fontWeight: "bold",

          color:
            activeColor,
        }}
      >
        {state ? "ON" : "OFF"}
      </p>

    </motion.div>
  );
}

// ================= CHART =================

function SmoothChart({
  title,
  dataKey,
  data,
  color,
  theme,
}) {
  return (
    <motion.div
      whileHover={{
        scale: 1.02,
      }}
      style={theme.card}
    >
      <h3>{title}</h3>

      <ResponsiveContainer
        width="100%"
        height={280}
      >
        <AreaChart data={data}>
          <defs>
            <linearGradient
              id={dataKey}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={color}
                stopOpacity={0.8}
              />

              <stop
                offset="95%"
                stopColor={color}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke={
              theme.chartGridColor
            }
          />

          <XAxis
            dataKey="time"
            interval="preserveStartEnd"
          />

          <YAxis />

          <Tooltip
            contentStyle={{
              background:
                theme.tooltipBg,

              border: "none",

              borderRadius: 12,

              color:
                theme.tooltipText,
            }}
          />

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#${dataKey})`}
            strokeWidth={3}
          />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ================= BUTTON STYLE =================

function buttonStyle(
  active,
  color,
  darkMode
) {
  return {
    padding: "12px 20px",

    border: "none",

    borderRadius: 14,

    background: active
      ? color
      : darkMode
      ? "#334155"
      : "#cbd5e1",

    color: active
      ? "#fff"
      : darkMode
      ? "#fff"
      : "#111",

    fontWeight: "bold",

    cursor: "pointer",
  };
}

export default App;