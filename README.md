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
```
## 🔧 Hardware Components
# 🖥 Microcontrollers
- ESP32
- Arduino UNO/Nano

# 🌡 Sensors
- DHT22 (Inside temperature & humidity)
- DHT11 (Outside temperature & humidity)
- Capacitive Soil Moisture Sensors

# ⚡ Actuators
- Exhaust Fan
- Intake Fan
- Water Pump
- Servo/Window Motor
- Relay Modules

# 💻 Software Technologies

| Technology | Usage |
|---|---|
| React.js | Dashboard UI |
| MQTT | Real-time communication |
| ESP32 Arduino Framework | Embedded programming |
| PubSubClient | MQTT library |
| Recharts | Data visualization |
| Framer Motion | UI animations |

---

## 📊 Dashboard Features
# 🏠 Dashboard Page
Display:
- Live sensor cards
- Real-time charts
- Alerts system
- Device status indicators

# 📈 Analytics Page

Provides:

- Historical charts
- Long-term monitoring
- Temperature trends
- Humidity analysis
- Soil moisture analytics

# 🧪 Sensors Page

Dedicated page for:

- Environmental sensor values
- Monitoring accuracy
- Real-time updates
- 🎛 Controls Page

Allows:

- AUTO/MANUAL mode switching
- Device control
- Emergency stop
- Smart automation management

#🌱 Plants Page
Contains recommended environmental conditions for:

- Tomato
- Lettuce
- Cucumber
- Pepper
  
# 🔥 MQTT Topics
Sensor Data
```
greenhouse/tempInside
greenhouse/humInside
greenhouse/tempOutside
greenhouse/humOutside
greenhouse/soil
```
Device States
```
greenhouse/exhaustFan
greenhouse/intakeFan
greenhouse/window
greenhouse/pump
greenhouse/mode
```
Control Topics
```
greenhouse/control/fan
greenhouse/control/intakeFan
greenhouse/control/window
greenhouse/control/pump
greenhouse/control/mode
```
# 🛡 Offline Automation
One of the most important features:

✅ Greenhouse automation continues even when:

- WiFi disconnects
- MQTT broker stops
- Dashboard closes

The ESP32 keeps controlling the greenhouse locally.

# 📂 Project Structure
```text
smart-greenhouse/
│
├── dashboard/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── esp32/
│   └── greenhouse_esp32.ino
│
├── arduino/
│   └── greenhouse_arduino.ino
│
├── prototype/
│   └── images/
│
└── README.md
```
## 🚀 Installation
# 1️⃣ Clone Repository
```
git clone https://github.com/YOUR_USERNAME/smart-greenhouse.git
```
# 2️⃣ Install Dashboard
```
cd dashboard
npm install
npm start
```
# 3️⃣ Start MQTT Broker

Example using Mosquitto:

mosquitto
# 4️⃣ Upload ESP32 Code

Open:
```
greenhouse_esp32.ino
```
Upload using Arduino IDE.

# 5️⃣ Upload Arduino Code

Open:
```
greenhouse_arduino.ino
```
Upload using Arduino IDE.

## 📷 Prototype Images
# Prototype Overview
<img width="1280" height="937" alt="Experimental Setup" src="https://github.com/user-attachments/assets/f5fd5ad8-fdfd-40d8-a07a-d457cab195ce" />
<img width="1280" height="960" alt="fan and window" src="https://github.com/user-attachments/assets/6f09b73f-dd53-46a9-b09e-07234f73f734" />

# Dashboard Interface
<img width="1889" height="1074" alt="Screenshot 2026-05-23 193219" src="https://github.com/user-attachments/assets/72c945fc-c9de-402d-8aa6-d45f53062a84" />

# Hardware Wiring
<img width="1280" height="828" alt="controler" src="https://github.com/user-attachments/assets/31af717b-4735-4bec-b80b-bd5beeaf2bd4" />

## 📌 Future Improvements
- AI prediction system
- Cloud database integration
- Mobile application
- Camera monitoring
- Weather forecast integration
- Energy optimization
- Solar-powered greenhouse
