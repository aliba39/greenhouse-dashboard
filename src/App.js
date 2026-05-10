import React, { useEffect, useState } from "react";
import mqtt from "mqtt";
import { motion } from "framer-motion";

import logo from "./assets/logo.png";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area,
} from "recharts";

const MQTT_URL = "ws://localhost:9001";

// ==================================================
// THEMES
// ==================================================

const dark = {
  container: {
    background: "#0b1220",
    color: "#fff",
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "Segoe UI",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
    gap: 20,
    marginTop: 20,
  },

  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
    gap: 20,
    marginTop: 30,
  },

  card: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
};

const light = {
  container: {
    background: "#f4f7fb",
    color: "#111",
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "Segoe UI",
  },

  grid: dark.grid,
  chartGrid: dark.chartGrid,

  card: {
    background: "#fff",
    borderRadius: 22,
    padding: 20,
    boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
    border: "1px solid rgba(0,0,0,0.05)",
  },
};

function App() {

  const [client, setClient] = useState(null);

  const [connected, setConnected] = useState(false);

  const [darkMode, setDarkMode] = useState(true);

  const [history, setHistory] = useState([]);

  const [data, setData] = useState({
    temp: 0,
    hum: 0,
    soil: 0,

    fan: "OFF",
    window: "CLOSE",
    pump: "OFF",

    mode: "AUTO",
  });

  const theme = darkMode ? dark : light;

  // ==================================================
  // ALERTS
  // ==================================================

  const alerts = [];

  if (data.temp >= 40) {
    alerts.push({
      color: "#ef4444",
      text: "🚨 Critical Temperature Detected",
    });
  }

  if (data.temp <= 10) {
    alerts.push({
      color: "#3b82f6",
      text: "❄ Temperature Too Low",
    });
  }

  if (data.hum >= 90) {
    alerts.push({
      color: "#06b6d4",
      text: "💧 Humidity Too High",
    });
  }

  if (data.hum <= 30) {
    alerts.push({
      color: "#f59e0b",
      text: "⚠ Humidity Too Low",
    });
  }

  if (data.soil <= 20) {
    alerts.push({
      color: "#eab308",
      text: "🌱 Soil Moisture Low",
    });
  }

  // ==================================================
  // MQTT
  // ==================================================

  useEffect(() => {

    const mqttClient = mqtt.connect(MQTT_URL);

    mqttClient.on("connect", () => {

      setConnected(true);

      mqttClient.subscribe("greenhouse/#");
    });

    mqttClient.on("offline", () => {
      setConnected(false);
    });

    mqttClient.on("reconnect", () => {
      setConnected(false);
    });

    mqttClient.on("message", (topic, msg) => {

      const value = msg.toString();

      setData((prev) => ({
        ...prev,

        ...(topic === "greenhouse/temp" && {
          temp: Number(value),
        }),

        ...(topic === "greenhouse/hum" && {
          hum: Number(value),
        }),

        ...(topic === "greenhouse/soil" && {
          soil: Math.max(
            0,
            Math.min(
              100,
              Math.round(
                ((4095 - Number(value)) / 4095) * 100
              )
            )
          ),
        }),

        ...(topic === "greenhouse/fan" && {
          fan: value,
        }),

        ...(topic === "greenhouse/window" && {
          window: value,
        }),

        ...(topic === "greenhouse/pump" && {
          pump: value,
        }),

        ...(topic === "greenhouse/mode" && {
          mode: value,
        }),
      }));

      // ==================================================
      // HISTORY
      // ==================================================

      if (
        topic.includes("temp") ||
        topic.includes("hum") ||
        topic.includes("soil")
      ) {

        setHistory((prev) => {

          const last = prev[prev.length - 1] || {};

          return [

            ...prev.slice(-40),

            {
              time: new Date().toLocaleTimeString(),

              temp:
                topic === "greenhouse/temp"
                  ? Number(value)
                  : last.temp || 0,

              hum:
                topic === "greenhouse/hum"
                  ? Number(value)
                  : last.hum || 0,

              soil:
                topic === "greenhouse/soil"
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(
                          ((4095 - Number(value)) / 4095) * 100
                        )
                      )
                    )
                  : last.soil || 0,
            },
          ];
        });
      }
    });

    setClient(mqttClient);

    return () => mqttClient.end();

  }, []);

  // ==================================================
  // SEND
  // ==================================================

  const send = (topic, msg) => {

    if (client && connected) {
      client.publish(topic, msg);
    }
  };

  return (

    <div style={theme.container}>

      {/* HEADER */}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: "flex",
          justifyContent: "space-between",
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

          <motion.img
            whileHover={{ scale: 1.05 }}
            src={logo}
            alt="logo"
            style={{
              width: 100,
              height: 100,
              objectFit: "contain",
            }}
          />

          <div>

            <h1
              style={{
                marginBottom: 5,
                fontSize: "clamp(24px,5vw,40px)",
              }}
            >
              Greensense
            </h1>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >

              <motion.div
                animate={{
                  scale: connected ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                }}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background:
                    connected
                      ? "#22c55e"
                      : "#ef4444",

                  boxShadow:
                    connected
                      ? "0 0 14px #22c55e"
                      : "0 0 14px #ef4444",
                }}
              />

              <span
                style={{
                  fontWeight: "bold",
                }}
              >
                {connected
                  ? "MQTT Connected"
                  : "MQTT Disconnected"}
              </span>

            </div>

          </div>

        </div>

        {/* DARK MODE */}

        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            border: "none",
            borderRadius: 14,
            padding: "12px 20px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 15,
          }}
        >
          {darkMode ? "☀ Light" : "🌙 Dark"}
        </button>

      </motion.div>

      {/* ALERTS */}

      {alerts.length > 0 && (

        <div
          style={{
            marginTop: 25,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >

          {alerts.map((alert, index) => (

            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.02 }}
              style={{
                background: alert.color,
                padding: 18,
                borderRadius: 16,
                fontWeight: "bold",
                boxShadow:
                  "0 0 20px rgba(0,0,0,0.2)",
              }}
            >
              {alert.text}
            </motion.div>

          ))}

        </div>

      )}

      {/* GAUGES */}

      <div style={theme.grid}>

        <Gauge
          title="Temperature"
          value={data.temp}
          max={50}
          unit="°C"
          color="#22c55e"
          theme={theme}
        />

        <Gauge
          title="Humidity"
          value={data.hum}
          max={100}
          unit="%"
          color="#38bdf8"
          theme={theme}
        />

        <Gauge
          title="Soil Moisture"
          value={data.soil}
          max={100}
          unit="%"
          color="#facc15"
          theme={theme}
        />

      </div>

      {/* DEVICE STATUS */}

      <div style={theme.grid}>

        <Status
          title="🌀 Fan"
          value={data.fan}
          theme={theme}
        />

        <Status
          title="🪟 Window"
          value={data.window}
          theme={theme}
        />

        <Status
          title="💧 Pump"
          value={data.pump}
          theme={theme}
        />

      </div>

      {/* MODE */}

      <motion.div
        whileHover={{ scale: 1.01 }}
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

          <p
            style={{
              color:
                data.mode === "AUTO"
                  ? "#22c55e"
                  : "#facc15",

              fontWeight: "bold",
              fontSize: 22,
            }}
          >
            {data.mode}
          </p>

        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >

          <button
            onClick={() =>
              send(
                "greenhouse/control/mode",
                "AUTO"
              )
            }
            style={{
              padding: "12px 22px",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              fontWeight: "bold",

              background:
                data.mode === "AUTO"
                  ? "#22c55e"
                  : "#444",

              color: "#fff",
            }}
          >
            AUTO
          </button>

          <button
            onClick={() =>
              send(
                "greenhouse/control/mode",
                "MANUAL"
              )
            }
            style={{
              padding: "12px 22px",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              fontWeight: "bold",

              background:
                data.mode === "MANUAL"
                  ? "#3b82f6"
                  : "#444",

              color: "#fff",
            }}
          >
            MANUAL
          </button>

        </div>

      </motion.div>

      {/* CHARTS */}

      <div style={theme.chartGrid}>

        <SmoothChart
          title="Temperature"
          dataKey="temp"
          color="#22c55e"
          data={history}
          unit="°C"
          theme={theme}
        />

        <SmoothChart
          title="Humidity"
          dataKey="hum"
          color="#38bdf8"
          data={history}
          unit="%"
          theme={theme}
        />

        <SmoothChart
          title="Soil Moisture"
          dataKey="soil"
          color="#facc15"
          data={history}
          unit="%"
          theme={theme}
        />

      </div>

      {/* CONTROL PANEL */}

      <h2 style={{ marginTop: 40 }}>
        🎛 Control Panel
      </h2>

      <div style={theme.grid}>

        <Toggle
          label="Fan"
          disabled={data.mode === "AUTO"}
          state={data.fan === "ON"}
          onToggle={(v) =>
            send(
              "greenhouse/control/fan",
              v ? "ON" : "OFF"
            )
          }
          theme={theme}
        />

        <Toggle
          label="Window"
          disabled={data.mode === "AUTO"}
          state={data.window === "OPEN"}
          onToggle={(v) =>
            send(
              "greenhouse/control/window",
              v ? "OPEN" : "CLOSE"
            )
          }
          theme={theme}
        />

        <Toggle
          label="Pump"
          disabled={data.mode === "AUTO"}
          state={data.pump === "ON"}
          onToggle={(v) =>
            send(
              "greenhouse/control/pump",
              v ? "ON" : "OFF"
            )
          }
          theme={theme}
        />

      </div>

    </div>
  );
}

// ==================================================
// GAUGE
// ==================================================

function Gauge({
  title,
  value,
  max,
  unit,
  color,
  theme,
}) {

  const percentage =
    Math.min((value / max) * 100, 100);

  const data = [
    {
      name: title,
      value: percentage,
      fill: color,
    },
  ];

  return (

    <motion.div
      whileHover={{ scale: 1.03 }}
      style={theme.card}
    >

      <h3
        style={{
          textAlign: "center",
          marginBottom: 10,
        }}
      >
        {title}
      </h3>

      <ResponsiveContainer
        width="100%"
        height={250}
      >

        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          barSize={18}
          data={data}
          startAngle={180}
          endAngle={0}
        >

          <RadialBar
            background
            dataKey="value"
            clockWise
          />

          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fill: color,
              fontSize: 28,
              fontWeight: "bold",
            }}
          >
            {value}
            {unit}
          </text>

        </RadialBarChart>

      </ResponsiveContainer>

    </motion.div>
  );
}

// ==================================================
// STATUS
// ==================================================

function Status({
  title,
  value,
  theme,
}) {

  const active =
    value === "ON" ||
    value === "OPEN";

  return (

    <motion.div
      whileHover={{ scale: 1.03 }}
      style={theme.card}
    >

      <h3>{title}</h3>

      <p
        style={{
          fontSize: 28,
          fontWeight: "bold",

          color:
            active
              ? "#22c55e"
              : "#ef4444",
        }}
      >
        {value}
      </p>

    </motion.div>
  );
}

// ==================================================
// TOGGLE
// ==================================================

function Toggle({
  label,
  state,
  onToggle,
  disabled,
  theme,
}) {

  return (

    <motion.div
      whileHover={{
        scale: disabled ? 1 : 1.03,
      }}
      style={{
        ...theme.card,
        opacity: disabled ? 0.6 : 1,
      }}
    >

      <h3>{label}</h3>

      <div
        onClick={() => {

          if (!disabled) {
            onToggle(!state);
          }
        }}

        style={{
          width: 72,
          height: 36,

          borderRadius: 50,

          background:
            state
              ? "#22c55e"
              : "#ef4444",

          position: "relative",

          cursor:
            disabled
              ? "not-allowed"
              : "pointer",

          transition: "0.3s",
        }}
      >

        <motion.div
          animate={{
            left: state ? 39 : 3,
          }}
          transition={{
            duration: 0.3,
          }}
          style={{
            width: 30,
            height: 30,

            borderRadius: "50%",

            background: "#fff",

            position: "absolute",

            top: 3,
          }}
        />

      </div>

      <p style={{ marginTop: 10 }}>

        {state
          ? "ON / OPEN"
          : "OFF / CLOSE"}

      </p>

    </motion.div>
  );
}

// ==================================================
// SMOOTH CHART
// ==================================================

function SmoothChart({
  title,
  dataKey,
  data,
  color,
  unit,
  theme,
}) {

  const values =
    data.map((d) => d[dataKey]);

  const min =
    values.length > 0
      ? Math.min(...values)
      : 0;

  const max =
    values.length > 0
      ? Math.max(...values)
      : 0;

  return (

    <motion.div
      whileHover={{ scale: 1.02 }}
      style={theme.card}
    >

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 10,
        }}
      >

        <h3>{title}</h3>

        <div
          style={{
            fontSize: 14,
            opacity: 0.8,
          }}
        >
          Min: {min}{unit} | Max: {max}{unit}
        </div>

      </div>

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
            stroke="#555"
          />

          <XAxis dataKey="time" />

          <YAxis />

          <Tooltip />

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#${dataKey})`}
            strokeWidth={3}
            animationDuration={500}
          />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            dot={false}
            strokeWidth={2}
          />

        </AreaChart>

      </ResponsiveContainer>

    </motion.div>
  );
}

export default App;