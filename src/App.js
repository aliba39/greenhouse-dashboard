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
  FaSeedling,
  FaSignOutAlt,
  FaUserShield,
  FaCreditCard,
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
    background: "linear-gradient(135deg,#0f172a,#111827,#020617)",
    color: "#f8fafc",
    minHeight: "100vh",
    padding: "20px",
    paddingLeft: sidebarOpen ? "240px" : "110px",
    fontFamily: "Segoe UI",
    position: "relative",
    overflowX: "hidden",
    transition: "all 0.3s ease",
  }),

  sidebar: {
    background: "rgba(15,23,42,0.88)",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(18px)",
  },

  card: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
    backdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.08)",
    transition: "0.3s",
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

  chartGridColor: "rgba(255,255,255,0.08)",

  tooltipBg: "#0f172a",

  tooltipText: "#fff",
};

const light = {
  container: (sidebarOpen) => ({
    background: "linear-gradient(135deg,#f8fafc,#e2e8f0,#cbd5e1)",
    color: "#0f172a",
    minHeight: "100vh",
    padding: "20px",
    paddingLeft: sidebarOpen ? "240px" : "110px",
    fontFamily: "Segoe UI",
    position: "relative",
    overflowX: "hidden",
    transition: "all 0.3s ease",
  }),

  sidebar: {
    background: "rgba(255,255,255,0.9)",
    borderRight: "1px solid rgba(0,0,0,0.08)",
    backdropFilter: "blur(16px)",
  },

  card: {
    background: "rgba(255,255,255,0.9)",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.05)",
    transition: "0.3s",
  },

  grid: dark.grid,

  chartGrid: dark.chartGrid,

  chartGridColor: "rgba(0,0,0,0.08)",

  tooltipBg: "#ffffff",

  tooltipText: "#0f172a",
};

// ================= APP =================

function App() {
  // ================= AUTH =================

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [loginError, setLoginError] = useState("");

  // ================= STATES =================

  const [client, setClient] = useState(null);

  const [connected, setConnected] = useState(false);

  const [darkMode, setDarkMode] = useState(true);

  const [history, setHistory] = useState([]);

  const [activePage, setActivePage] = useState("dashboard");

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [timeNow, setTimeNow] = useState(new Date());

  const [data, setData] = useState({
    tempInside: 0,
    humInside: 0,

    tempOutside: 0,
    humOutside: 0,

    soil: 0,

    exhaustFan: "OFF",
    intakeFan: "OFF",
    window: "CLOSE",
    pump: "OFF",

    mode: "AUTO",
  });

  const theme = darkMode ? dark : light;

    // ================= LOGIN =================

  const handleLogin = () => {
    if (
      loginData.username === "admin" &&
      loginData.password === "admin123"
    ) {
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Invalid username or password");
    }
  };

  // ================= CLOCK =================

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ================= MQTT =================

  useEffect(() => {
    const mqttClient = mqtt.connect(MQTT_URL);

    mqttClient.on("connect", () => {
      setConnected(true);
      mqttClient.subscribe("greenhouse/#");
    });

    mqttClient.on("offline", () => {
      setConnected(false);
    });

    mqttClient.on("message", (topic, msg) => {
      const value = msg.toString();

      setData((prev) => {
        const updated = {
          ...prev,

          ...(topic === "greenhouse/tempInside" && {
            tempInside: Number(value),
          }),

          ...(topic === "greenhouse/humInside" && {
            humInside: Number(value),
          }),

          ...(topic === "greenhouse/tempOutside" && {
            tempOutside: Number(value),
          }),

          ...(topic === "greenhouse/humOutside" && {
            humOutside: Number(value),
          }),

          ...(topic === "greenhouse/soil" && {
            soil: Math.max(
              0,
              Math.min(
                100,
                Math.round(((4095 - Number(value)) / 4095) * 100)
              )
            ),
          }),

          ...(topic === "greenhouse/exhaustFan" && {
            exhaustFan: value,
          }),

          ...(topic === "greenhouse/intakeFan" && {
            intakeFan: value,
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
        };

        setHistory((prevHistory) => [
          ...prevHistory.slice(-50),
          {
            time: new Date().toLocaleTimeString(),
            tempInside: updated.tempInside,
            humInside: updated.humInside,
            tempOutside: updated.tempOutside,
            humOutside: updated.humOutside,
            soil: updated.soil,
          },
        ]);

        return updated;
      });
    });

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
    send("greenhouse/control/mode", "MANUAL");

    setTimeout(() => {
      send("greenhouse/control/exhaustFan", "OFF");
      send("greenhouse/control/intakeFan", "OFF");
      send("greenhouse/control/pump", "OFF");
      send("greenhouse/control/window", "CLOSE");
    }, 300);
  };

  // ================= LOGIN PAGE =================

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background:
            "linear-gradient(135deg,#0f172a,#111827,#020617)",
          fontFamily: "Segoe UI",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: 400,
            background: "rgba(255,255,255,0.08)",
            padding: 40,
            borderRadius: 30,
            backdropFilter: "blur(20px)",
            color: "#fff",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <img
              src={logo}
              alt="logo"
              style={{
                width: 100,
                marginBottom: 20,
              }}
            />

            <h1>GreenSense</h1>

            <p>Smart Greenhouse Dashboard</p>
          </div>

          <div style={{ marginTop: 30 }}>
            <input
              type="text"
              placeholder="Username"
              value={loginData.username}
              onChange={(e) =>
                setLoginData({
                  ...loginData,
                  username: e.target.value,
                })
              }
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="Password"
              value={loginData.password}
              onChange={(e) =>
                setLoginData({
                  ...loginData,
                  password: e.target.value,
                })
              }
              style={{
                ...inputStyle,
                marginTop: 15,
              }}
            />

            {loginError && (
              <p
                style={{
                  color: "#ef4444",
                  marginTop: 10,
                }}
              >
                {loginError}
              </p>
            )}

            <button
              onClick={handleLogin}
              style={{
                width: "100%",
                marginTop: 20,
                padding: 15,
                border: "none",
                borderRadius: 16,
                background:
                  "linear-gradient(90deg,#22c55e,#16a34a)",
                color: "#fff",
                fontWeight: "bold",
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              <FaUserShield /> LOGIN
            </button>

            <div
              style={{
                marginTop: 20,
                textAlign: "center",
                opacity: 0.8,
              }}
            >
              Username: admin
              <br />
              Password: admin123
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ================= ALERTS =================

  const alerts = [];

  if (data.tempInside >= 35) {
    alerts.push({
      color: "#ef4444",
      text: "🔥 Greenhouse temperature is too high",
    });
  }

  if (data.tempInside <= 10) {
    alerts.push({
      color: "#3b82f6",
      text: "🥶 Temperature is too low",
    });
  }

  if (data.soil <= 25) {
    alerts.push({
      color: "#eab308",
      text: "🌱 Soil moisture is low",
    });
  }

  if (data.humInside >= 90) {
    alerts.push({
      color: "#8b5cf6",
      text: "💧 Humidity too high",
    });
  }

  // ================= PLANT PROFILES =================

  const plantProfiles = {
    Tomato: {
      temp: "22-30°C",
      hum: "60-80%",
      soil: "50-70%",
      color: "#ef4444",
    },

    Lettuce: {
      temp: "15-22°C",
      hum: "50-70%",
      soil: "60-80%",
      color: "#22c55e",
    },

    Cucumber: {
      temp: "20-28°C",
      hum: "70-90%",
      soil: "65-85%",
      color: "#38bdf8",
    },

    Pepper: {
      temp: "18-26°C",
      hum: "50-70%",
      soil: "55-75%",
      color: "#f59e0b",
    },
  };

  // ================= RENDER =================

  return (
    <div style={theme.container(sidebarOpen)}>
      {/* SIDEBAR */}

      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: sidebarOpen ? 220 : 90,
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
            justifyContent: sidebarOpen ? "space-between" : "center",
            alignItems: "center",
            padding: "0 20px",
          }}
        >
          {sidebarOpen && <h2>GreenSense</h2>}

          <div
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              cursor: "pointer",
            }}
          >
            {sidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
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
            active={activePage === "dashboard"}
            open={sidebarOpen}
            onClick={() => setActivePage("dashboard")}
          />

          <SidebarItem
            icon={<FaChartLine />}
            text="Analytics"
            active={activePage === "analytics"}
            open={sidebarOpen}
            onClick={() => setActivePage("analytics")}
          />

          <SidebarItem
            icon={<FaLeaf />}
            text="Sensors"
            active={activePage === "sensors"}
            open={sidebarOpen}
            onClick={() => setActivePage("sensors")}
          />

          <SidebarItem
            icon={<FaWater />}
            text="Controls"
            active={activePage === "controls"}
            open={sidebarOpen}
            onClick={() => setActivePage("controls")}
          />

          <SidebarItem
            icon={<FaSeedling />}
            text="Plants"
            active={activePage === "plants"}
            open={sidebarOpen}
            onClick={() => setActivePage("plants")}
          />
        </div>

        <SidebarItem
          icon={<FaUserShield />}
          text="Subscription"
          active={activePage === "subscription"}
          open={sidebarOpen}
          onClick={() => setActivePage("subscription")}
        />

        {/* LOGOUT */}

        <div
          style={{
            marginTop: "auto",
            padding: 20,
          }}
        >
          <button
            onClick={() => setIsAuthenticated(false)}
            style={{
              width: "100%",
              padding: 12,
              border: "none",
              borderRadius: 14,
              background: "#ef4444",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>

        {/* LIVE PREVIEW */}

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
              <h4>📡 Live Preview</h4>

              <p>🌡 {data.tempInside}°C</p>

              <p>💧 {data.humInside}%</p>

              <p>🌱 {data.soil}%</p>
            </div>
          </div>
        )}
      </div>

      {/* HEADER */}

      <div
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
          <img
            src={logo}
            alt="logo"
            style={{
              width: 80,
              height: 80,
            }}
          />

          <div>
            <h1>GreenSense</h1>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: connected ? "#22c55e" : "#ef4444",
                }}
              />

              <span>
                {connected ? "MQTT Connected" : "Disconnected"}
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
              alignItems: "center",
              gap: 10,
            }}
          >
            <FaClock />

            <span>{timeNow.toLocaleTimeString()}</span>
          </div>

          <div
            style={{
              marginTop: 5,
            }}
          >
            {timeNow.toLocaleDateString()}
          </div>
        </motion.div>

        {/* THEME BUTTON */}

        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            border: "none",
            borderRadius: 14,
            padding: "12px 20px",
            cursor: "pointer",
            fontWeight: "bold",
            background: darkMode ? "#fff" : "#111",
            color: darkMode ? "#111" : "#fff",
          }}
        >
          {darkMode ? "☀ Light" : "🌙 Dark"}
        </button>
      </div>

      {/* DASHBOARD */}

      {activePage === "dashboard" && (
        <>
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
              label="Exhaust Fan"
              active={data.exhaustFan === "ON"}
            />

            <LiveStatus
              label="Intake Fan"
              active={data.intakeFan === "ON"}
            />

            <LiveStatus
              label="Pump"
              active={data.pump === "ON"}
            />

            <LiveStatus
              label="Window"
              active={data.window === "OPEN"}
            />
          </div>

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
                  initial={{
                    opacity: 0,
                    y: -10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  style={{
                    background: alert.color,
                    padding: 18,
                    borderRadius: 16,
                    fontWeight: "bold",
                  }}
                >
                  {alert.text}
                </motion.div>
              ))}
            </div>
          )}

          {/* SENSOR CARDS */}

          <div style={theme.grid}>
            <StatCard
              title="Inside Temperature"
              value={`${data.tempInside}°C`}
              color="#22c55e"
              icon={<FaTemperatureHigh />}
              theme={theme}
            />

            <StatCard
              title="Inside Humidity"
              value={`${data.humInside}%`}
              color="#38bdf8"
              icon={<FaTint />}
              theme={theme}
            />

            <StatCard
              title="Outside Temperature"
              value={`${data.tempOutside}°C`}
              color="#f97316"
              icon={<FaTemperatureHigh />}
              theme={theme}
            />

            <StatCard
              title="Outside Humidity"
              value={`${data.humOutside}%`}
              color="#06b6d4"
              icon={<FaTint />}
              theme={theme}
            />

            <StatCard
              title="Soil Moisture"
              value={`${data.soil}%`}
              color="#facc15"
              icon={<FaLeaf />}
              theme={theme}
            />
          </div>

          {/* CHARTS */}

          <div style={theme.chartGrid}>
            <SmoothChart
              title="Inside Temperature"
              dataKey="tempInside"
              color="#22c55e"
              data={history}
              theme={theme}
            />

            <SmoothChart
              title="Inside Humidity"
              dataKey="humInside"
              color="#38bdf8"
              data={history}
              theme={theme}
            />

            <SmoothChart
              title="Soil Moisture"
              dataKey="soil"
              color="#facc15"
              data={history}
              theme={theme}
            />
          </div>
        </>
      )}

      {/* ANALYTICS */}

      {activePage === "analytics" && (
        <div style={{ marginTop: 30 }}>
          <h1>📈 Analytics</h1>

          <div style={theme.chartGrid}>
            <SmoothChart
              title="Inside Temperature"
              dataKey="tempInside"
              color="#22c55e"
              data={history}
              theme={theme}
            />

            <SmoothChart
              title="Inside Humidity"
              dataKey="humInside"
              color="#38bdf8"
              data={history}
              theme={theme}
            />

            <SmoothChart
              title="Outside Temperature"
              dataKey="tempOutside"
              color="#f97316"
              data={history}
              theme={theme}
            />

            <SmoothChart
              title="Outside Humidity"
              dataKey="humOutside"
              color="#06b6d4"
              data={history}
              theme={theme}
            />
          </div>
        </div>
      )}

      {/* SENSORS */}

      {activePage === "sensors" && (
        <div style={{ marginTop: 30 }}>
          <h1>🧪 Sensors</h1>

          <div style={theme.grid}>
            <StatCard
              title="Inside Temperature"
              value={`${data.tempInside}°C`}
              color="#22c55e"
              icon={<FaTemperatureHigh />}
              theme={theme}
            />

            <StatCard
              title="Inside Humidity"
              value={`${data.humInside}%`}
              color="#38bdf8"
              icon={<FaTint />}
              theme={theme}
            />

            <StatCard
              title="Outside Temperature"
              value={`${data.tempOutside}°C`}
              color="#f97316"
              icon={<FaTemperatureHigh />}
              theme={theme}
            />

            <StatCard
              title="Outside Humidity"
              value={`${data.humOutside}%`}
              color="#06b6d4"
              icon={<FaTint />}
              theme={theme}
            />

            <StatCard
              title="Soil Moisture"
              value={`${data.soil}%`}
              color="#facc15"
              icon={<FaLeaf />}
              theme={theme}
            />
          </div>
        </div>
      )}

      {/* SUBSCRIPTION */}

      {activePage === "subscription" && (
        <div style={{ marginTop: 30 }}>
          <h1>💳 Subscription Plans</h1>

          <div style={theme.grid}>
            {/* BASIC */}

            <motion.div
              whileHover={{ scale: 1.03 }}
              style={{
                ...theme.card,
                borderTop: "5px solid #38bdf8",
              }}
            >
              <h2 style={{ color: "#38bdf8" }}>
                Basic Plan
              </h2>

              <h1>$9 / month</h1>

              <p>✔ Live Sensor Monitoring</p>
              <p>✔ MQTT Connection</p>
              <p>✔ Basic Analytics</p>
              <p>✔ Manual Controls</p>

              <button
                style={{
                  marginTop: 20,
                  width: "100%",
                  padding: 14,
                  border: "none",
                  borderRadius: 14,
                  background: "#38bdf8",
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Subscribe
              </button>
            </motion.div>

            {/* PRO */}

            <motion.div
              whileHover={{ scale: 1.03 }}
              style={{
                ...theme.card,
                borderTop: "5px solid #22c55e",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 15,
                  right: 15,
                  background: "#22c55e",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: "bold",
                }}
              >
                MOST POPULAR
              </div>

              <h2 style={{ color: "#22c55e" }}>
                Pro Plan
              </h2>

              <h1>$19 / month</h1>

              <p>✔ Everything in Basic</p>
              <p>✔ AI Automation</p>
              <p>✔ Advanced Analytics</p>
              <p>✔ Smart Alerts</p>
              <p>✔ Remote Access</p>

              <button
                style={{
                  marginTop: 20,
                  width: "100%",
                  padding: 14,
                  border: "none",
                  borderRadius: 14,
                  background: "#22c55e",
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Upgrade
              </button>
            </motion.div>

            {/* ENTERPRISE */}

            <motion.div
              whileHover={{ scale: 1.03 }}
              style={{
                ...theme.card,
                borderTop: "5px solid #f59e0b",
              }}
            >
              <h2 style={{ color: "#f59e0b" }}>
                Enterprise
              </h2>

              <h1>$49 / month</h1>

              <p>✔ Unlimited Greenhouses</p>
              <p>✔ Full AI Control</p>
              <p>✔ Team Management</p>
              <p>✔ Cloud Backup</p>
              <p>✔ 24/7 Support</p>

              <button
                style={{
                  marginTop: 20,
                  width: "100%",
                  padding: 14,
                  border: "none",
                  borderRadius: 14,
                  background: "#f59e0b",
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Contact Us
              </button>
            </motion.div>
          </div>

          {/* PAYMENT CARD */}

          <motion.div
            whileHover={{ scale: 1.01 }}
            style={{
              ...theme.card,
              marginTop: 40,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <FaCreditCard
                size={30}
                color="#22c55e"
              />

              <h2>Payment Information</h2>
            </div>

            <div style={theme.grid}>
              <input
                placeholder="Card Holder Name"
                style={{
                  ...inputStyle,
                  color: darkMode ? "#fff" : "#111",
                  background: darkMode
                    ? "rgba(255,255,255,0.08)"
                    : "#fff",
                }}
              />

              <input
                placeholder="Card Number"
                style={{
                  ...inputStyle,
                  color: darkMode ? "#fff" : "#111",
                  background: darkMode
                    ? "rgba(255,255,255,0.08)"
                    : "#fff",
                }}
              />

              <input
                placeholder="MM/YY"
                style={{
                  ...inputStyle,
                  color: darkMode ? "#fff" : "#111",
                  background: darkMode
                    ? "rgba(255,255,255,0.08)"
                    : "#fff",
                }}
              />

              <input
                placeholder="CVV"
                style={{
                  ...inputStyle,
                  color: darkMode ? "#fff" : "#111",
                  background: darkMode
                    ? "rgba(255,255,255,0.08)"
                    : "#fff",
                }}
              />
            </div>

            <button
              style={{
                marginTop: 25,
                width: "100%",
                padding: 16,
                border: "none",
                borderRadius: 16,
                background:
                  "linear-gradient(90deg,#22c55e,#16a34a)",
                color: "#fff",
                fontWeight: "bold",
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              Complete Payment
            </button>
          </motion.div>
        </div>
      )}

      {/* CONTROLS */}

      {/* ================= CONTROLS PAGE ================= */}

      {activePage === "controls" && (

        <>

          <div
            style={{
              ...theme.card,
              marginTop: 30,
            }}
          >

            <h2>⚙ System Mode</h2>

            <h1
              style={{
                color:
                  data.mode === "AUTO"
                    ? "#22c55e"
                    : "#3b82f6",
              }}
            >
              {data.mode}
            </h1>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 20,
              }}
            >

              <button
                onClick={() => {
                  send(
                    "greenhouse/control/mode",
                    "AUTO"
                  );

                  setData(prev => ({
                    ...prev,
                    mode: "AUTO",
                  }));
                }}
                style={buttonStyle(
                  data.mode === "AUTO",
                  "#22c55e",
                  darkMode
                )}
              >
                AUTO
              </button>

              <button
                onClick={() => {
                  send(
                    "greenhouse/control/mode",
                    "MANUAL"
                  );

                  setData(prev => ({
                    ...prev,
                    mode: "MANUAL",
                  }));
                }}
                style={buttonStyle(
                  data.mode === "MANUAL",
                  "#3b82f6",
                  darkMode
                )}
              >
                MANUAL
              </button>

            </div>

          </div>

          {/* EMERGENCY BUTTON */}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
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
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            <FaExclamationTriangle /> EMERGENCY STOP
          </motion.button>

          {/* CONTROL PANEL */}

          <h2 style={{ marginTop: 40 }}>
            🎛 Control Panel
          </h2>

          <div style={theme.grid}>

            {/* EXHAUST FAN */}

            <Toggle
              label="Exhaust Fan"
              disabled={data.mode === "AUTO"}
              state={data.exhaustFan === "ON"}
              onToggle={(v) => {

                setData(prev => ({
                  ...prev,
                  exhaustFan: v ? "ON" : "OFF",
                }));

                send(
                  "greenhouse/control/fan",
                  v ? "ON" : "OFF"
                );
              }}
              theme={theme}
            />

            {/* INTAKE FAN */}

            <Toggle
              label="Intake Fan"
              disabled={data.mode === "AUTO"}
              state={data.intakeFan === "ON"}
              onToggle={(v) => {

                setData(prev => ({
                  ...prev,
                  intakeFan: v ? "ON" : "OFF",
                }));

                send(
                  "greenhouse/control/intakeFan",
                  v ? "ON" : "OFF"
                );
              }}
              theme={theme}
            />

            {/* WINDOW */}

            <Toggle
              label="Window"
              disabled={data.mode === "AUTO"}
              state={data.window === "OPEN"}
              onToggle={(v) => {

                setData(prev => ({
                  ...prev,
                  window: v ? "OPEN" : "CLOSE",
                }));

                send(
                  "greenhouse/control/window",
                  v ? "OPEN" : "CLOSE"
                );
              }}
              theme={theme}
            />

            {/* PUMP */}

            <Toggle
              label="Pump"
              disabled={data.mode === "AUTO"}
              state={data.pump === "ON"}
              onToggle={(v) => {

                setData(prev => ({
                  ...prev,
                  pump: v ? "ON" : "OFF",
                }));

                send(
                  "greenhouse/control/pump",
                  v ? "ON" : "OFF"
                );
              }}
              theme={theme}
            />

          </div>

        </>
      )}

      {/* PLANTS */}

      {activePage === "plants" && (
        <div style={{ marginTop: 30 }}>
          <h1>🌱 Plant Profiles</h1>

          <div style={theme.grid}>
            {Object.entries(plantProfiles).map(
              ([name, plant]) => (
                <motion.div
                  key={name}
                  whileHover={{
                    scale: 1.03,
                  }}
                  style={{
                    ...theme.card,
                    borderTop: `5px solid ${plant.color}`,
                  }}
                >
                  <h2
                    style={{
                      color: plant.color,
                    }}
                  >
                    {name}
                  </h2>

                  <p>
                    🌡 Temperature: {plant.temp}
                  </p>

                  <p>
                    💧 Humidity: {plant.hum}
                  </p>

                  <p>
                    🌱 Soil: {plant.soil}
                  </p>
                </motion.div>
              )
            )}
          </div>
        </div>
      )}
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

function LiveStatus({ label, active }) {
  return (
    <div
      style={{
        padding: "12px 18px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.08)",
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
          background: active ? "#22c55e" : "#ef4444",
        }}
      />

      <span>
        {label}: {active ? "ON" : "OFF"}
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
        justifyContent: "space-between",
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
  const activeColor = state ? "#22c55e" : "#ef4444";

  return (
    <motion.div
      whileHover={{
        scale: disabled ? 1 : 1.03,
      }}
      style={{
        ...theme.card,
        opacity: disabled ? 0.55 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 15,
        }}
      >
        <h3>{label}</h3>

        {disabled && (
          <span
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 20,
              background: "rgba(59,130,246,0.2)",
              color: "#3b82f6",
              fontWeight: "bold",
            }}
          >
            AUTO
          </span>
        )}
      </div>

      <div
        onClick={() => onToggle(!state)}
        style={{
          width: 72,
          height: 36,
          borderRadius: 50,
          background: activeColor,
          position: "relative",
          cursor: "pointer",
        }}
      >
        <motion.div
          animate={{
            x: state ? 36 : 0,
          }}
          transition={{
            duration: 0.2,
          }}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: 3,
          }}
        />
      </div>

      <p
        style={{
          marginTop: 12,
          fontWeight: "bold",
          color: activeColor,
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
            stroke={theme.chartGridColor}
          />

          <XAxis
            dataKey="time"
            angle={-35}
            textAnchor="end"
            height={70}
            minTickGap={20}
          />

          <YAxis />

          <Tooltip
            contentStyle={{
              background: theme.tooltipBg,
              border: "none",
              borderRadius: 12,
              color: theme.tooltipText,
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

function buttonStyle(active, color, darkMode) {
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
// ================= INPUT STYLE =================

const inputStyle = {
  width: "100%",
  padding: 15,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  outline: "none",
  fontSize: 16,
  boxSizing: "border-box",
};
export default App;