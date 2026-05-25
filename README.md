# 🌱 Smart Greenhouse Monitoring & Automation System

A complete IoT-based Smart Greenhouse system using:

- ESP32
- Arduino
- MQTT Protocol
- React Dashboard
- Real-time Automation
- Climate Monitoring
- Smart Irrigation
- Remote Control

---

# 📌 Project Overview

This project is an intelligent greenhouse automation system designed to monitor and control environmental conditions inside a greenhouse in real time.

The system collects sensor data using an ESP32 and Arduino, then sends it to a modern React dashboard using MQTT communication.

The greenhouse can work in:

- ✅ Automatic Mode
- ✅ Manual Mode
- ✅ Emergency Stop Mode

Even if WiFi or MQTT fails, the greenhouse automation continues locally on the ESP32.

---

# 🧠 Main Features

## 🌡 Environmental Monitoring

The system continuously monitors:

- Inside Temperature
- Outside Temperature
- Inside Humidity
- Outside Humidity
- Soil Moisture

---

## ⚙ Smart Automation

Automatic decisions are made based on sensor readings:

| Device | Automation |
|---|---|
| Exhaust Fan | Turns ON when temperature/humidity rises |
| Intake Fan | Activates when outside air is cooler |
| Water Pump | Irrigates when soil becomes dry |
| Window System | Opens for ventilation |

---

## 📡 Real-Time Dashboard

A premium React dashboard provides:

- Live sensor monitoring
- Beautiful animated charts
- Device status visualization
- Manual controls
- Dark/Light themes
- Analytics page
- Plant profiles
- Emergency stop button
- MQTT connection status

---

# 🏗 System Architecture

```text
Sensors → ESP32 → MQTT Broker → React Dashboard
               ↓
            Arduino
               ↓
          Relay Modules
               ↓
        Fan / Pump / Window
