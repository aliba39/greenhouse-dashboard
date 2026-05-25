#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// ======================================================
// WIFI
// ======================================================

const char* ssid = "3lilo";
const char* password = "00000000";

// ======================================================
// MQTT
// ======================================================

const char* mqtt_server = "192.168.43.230";

WiFiClient espClient;
PubSubClient client(espClient);

// ======================================================
// DHT22 INSIDE
// ======================================================

#define DHTPIN 4
#define DHTTYPE DHT22

DHT dhtInside(DHTPIN, DHTTYPE);

// ======================================================
// DHT11 OUTSIDE
// ======================================================

#define DHT_OUT_PIN 5
#define DHT_OUT_TYPE DHT11

DHT dhtOutside(DHT_OUT_PIN, DHT_OUT_TYPE);

// ======================================================
// SOIL
// ======================================================

#define SOIL1 34
#define SOIL2 35
#define SOIL3 32

// ======================================================
// STATES
// ======================================================

bool exhaustFanState = false;
bool intakeFanState = false;
bool windowState = false;
bool pumpState = false;

// ======================================================
// MODE
// ======================================================

String systemMode = "AUTO";

// ======================================================
// CONDITIONS
// ======================================================

float WINDOW_ON_TEMP = 30.0;
float WINDOW_OFF_TEMP = 27.0;

float FAN_ON_TEMP = 31.0;
float FAN_OFF_TEMP = 28.0;

float HIGH_HUMIDITY = 80.0;

int SOIL_DRY = 2800;
int SOIL_WET = 2400;

// ======================================================
// TIMERS
// ======================================================

unsigned long lastPublish = 0;
unsigned long lastWiFiTry = 0;
unsigned long lastMQTTTry = 0;

// ======================================================
// FLAGS
// ======================================================

bool wifiAvailable = false;
bool mqttAvailable = false;

// ======================================================
// WIFI CONNECT
// ======================================================

void setup_wifi() {

  Serial.println("Connecting WiFi...");

  WiFi.begin(ssid, password);

  unsigned long start = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - start < 10000
  ) {

    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {

    wifiAvailable = true;

    Serial.println("\nWiFi Connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

  } else {

    wifiAvailable = false;

    Serial.println("\nWiFi Failed");
  }
}

// ======================================================
// MQTT CONNECT
// ======================================================

void reconnectMQTT() {

  if (!wifiAvailable) return;

  Serial.println("Connecting MQTT...");

  if (client.connect("ESP32_GREENHOUSE")) {

    mqttAvailable = true;

    Serial.println("MQTT CONNECTED");

    client.subscribe("greenhouse/control/#");

    Serial.println("Subscribed to greenhouse/control/#");

  } else {

    mqttAvailable = false;

    Serial.print("MQTT FAILED rc=");
    Serial.println(client.state());
  }
}

// ======================================================
// SEND TO ARDUINO
// ======================================================

void sendToArduino(String cmd) {

  Serial.print("SEND -> ");
  Serial.println(cmd);

  Serial2.println(cmd);

  delay(50);

  Serial2.flush();
}

// ======================================================
// MQTT CALLBACK
// ======================================================

void callback(char* topic, byte* payload, unsigned int length) {

  String msg = "";

  for (int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  String t = String(topic);

  Serial.println("============== MQTT ==============");
  Serial.print("TOPIC: ");
  Serial.println(t);

  Serial.print("MESSAGE: ");
  Serial.println(msg);

  // ====================================================
  // MODE
  // ====================================================

  if (t == "greenhouse/control/mode") {

    systemMode = msg;

    Serial.print("MODE CHANGED TO: ");
    Serial.println(systemMode);

    return;
  }

  // ====================================================
  // MANUAL MODE ONLY
  // ====================================================

  if (systemMode != "MANUAL") {

    Serial.println("IGNORED -> AUTO MODE");
    return;
  }

  // ====================================================
  // EXHAUST FAN
  // ====================================================

  if (t == "greenhouse/control/fan") {

    if (msg == "ON") {

      exhaustFanState = true;
      sendToArduino("FAN_ON");

    } else {

      exhaustFanState = false;
      sendToArduino("FAN_OFF");
    }
  }

  // ====================================================
  // INTAKE FAN
  // ====================================================

  else if (t == "greenhouse/control/intakeFan") {

    if (msg == "ON") {

      intakeFanState = true;
      sendToArduino("INTAKE_ON");

    } else {

      intakeFanState = false;
      sendToArduino("INTAKE_OFF");
    }
  }

  // ====================================================
  // WINDOW
  // ====================================================

  else if (t == "greenhouse/control/window") {

    if (msg == "OPEN") {

      windowState = true;
      sendToArduino("WINDOW_OPEN");

    } else {

      windowState = false;
      sendToArduino("WINDOW_CLOSE");
    }
  }

  // ====================================================
  // PUMP
  // ====================================================

  else if (t == "greenhouse/control/pump") {

    if (msg == "ON") {

      pumpState = true;
      sendToArduino("PUMP_ON");

    } else {

      pumpState = false;
      sendToArduino("PUMP_OFF");
    }
  }
}

// ======================================================
// SETUP
// ======================================================

void setup() {

  Serial.begin(115200);

  Serial2.begin(9600, SERIAL_8N1, 16, 17);

  dhtInside.begin();
  dhtOutside.begin();

  setup_wifi();

  client.setServer(mqtt_server, 1883);

  client.setCallback(callback);

  reconnectMQTT();

  Serial.println("SYSTEM READY");
}

// ======================================================
// LOOP
// ======================================================

void loop() {

  // ====================================================
  // WIFI CHECK (NON BLOCKING)
  // ====================================================

  if (
    WiFi.status() != WL_CONNECTED &&
    millis() - lastWiFiTry > 15000
  ) {

    lastWiFiTry = millis();

    Serial.println("Retry WiFi...");

    setup_wifi();
  }

  if (WiFi.status() == WL_CONNECTED) {

    wifiAvailable = true;

  } else {

    wifiAvailable = false;
    mqttAvailable = false;
  }

  // ====================================================
  // MQTT CHECK (NON BLOCKING)
  // ====================================================

  if (
    wifiAvailable &&
    !client.connected() &&
    millis() - lastMQTTTry > 10000
  ) {

    lastMQTTTry = millis();

    reconnectMQTT();
  }

  if (client.connected()) {

    mqttAvailable = true;
    client.loop();

  } else {

    mqttAvailable = false;
  }

  // ====================================================
  // READ INSIDE SENSOR
  // ====================================================

  float tempInside = dhtInside.readTemperature();
  float humInside = dhtInside.readHumidity();

  // ====================================================
  // READ OUTSIDE SENSOR
  // ====================================================

  float tempOutside = dhtOutside.readTemperature();
  float humOutside = dhtOutside.readHumidity();

  // ====================================================
  // CHECK DHT
  // ====================================================

  if (
    isnan(tempInside) ||
    isnan(humInside) ||
    isnan(tempOutside) ||
    isnan(humOutside)
  ) {

    Serial.println("DHT ERROR");

    delay(2000);

    return;
  }

  // ====================================================
  // SOIL
  // ====================================================

  int soilRaw =
    (
      analogRead(SOIL1) +
      analogRead(SOIL2) +
      analogRead(SOIL3)
    ) / 3;

  // ====================================================
  // AUTO MODE
  // ====================================================

  if (systemMode == "AUTO") {

    // ==================================================
    // WINDOW
    // ==================================================

    bool newWindowState = windowState;

    if (
      tempInside > WINDOW_ON_TEMP ||
      humInside > HIGH_HUMIDITY
    ) {

      newWindowState = true;

    } else if (
      tempInside < WINDOW_OFF_TEMP &&
      humInside < 75
    ) {

      newWindowState = false;
    }

    if (newWindowState != windowState) {

      windowState = newWindowState;

      if (windowState) {

        sendToArduino("WINDOW_OPEN");

      } else {

        sendToArduino("WINDOW_CLOSE");
      }
    }

    // ==================================================
    // EXHAUST FAN
    // ==================================================

    bool newExhaustState = exhaustFanState;

    if (
      tempInside > FAN_ON_TEMP ||
      humInside > HIGH_HUMIDITY
    ) {

      newExhaustState = true;

    } else if (
      tempInside < FAN_OFF_TEMP &&
      humInside < 75
    ) {

      newExhaustState = false;
    }

    if (newExhaustState != exhaustFanState) {

      exhaustFanState = newExhaustState;

      if (exhaustFanState) {

        sendToArduino("FAN_ON");

      } else {

        sendToArduino("FAN_OFF");
      }
    }

    // ==================================================
    // INTAKE FAN
    // ==================================================

    bool newIntakeState = intakeFanState;

    // Outside air cooler -> intake ON
    if (tempOutside < tempInside) {

      newIntakeState = true;

    } else {

      newIntakeState = false;
    }

    if (newIntakeState != intakeFanState) {

      intakeFanState = newIntakeState;

      if (intakeFanState) {

        sendToArduino("INTAKE_ON");

      } else {

        sendToArduino("INTAKE_OFF");
      }
    }

    // ==================================================
    // PUMP
    // ==================================================

    bool newPumpState = pumpState;

    if (soilRaw > SOIL_DRY) {

      newPumpState = true;

    } else if (soilRaw < SOIL_WET) {

      newPumpState = false;
    }

    if (newPumpState != pumpState) {

      pumpState = newPumpState;

      if (pumpState) {

        sendToArduino("PUMP_ON");

      } else {

        sendToArduino("PUMP_OFF");
      }
    }
  }

  // ====================================================
  // SERIAL MONITOR
  // ====================================================

  Serial.println("========== DATA ==========");

  Serial.print("Inside Temp: ");
  Serial.println(tempInside);

  Serial.print("Inside Hum: ");
  Serial.println(humInside);

  Serial.print("Outside Temp: ");
  Serial.println(tempOutside);

  Serial.print("Outside Hum: ");
  Serial.println(humOutside);

  Serial.print("Soil Raw: ");
  Serial.println(soilRaw);

  Serial.print("Mode: ");
  Serial.println(systemMode);

  Serial.print("WiFi: ");
  Serial.println(wifiAvailable ? "OK" : "OFF");

  Serial.print("MQTT: ");
  Serial.println(mqttAvailable ? "OK" : "OFF");

  // ====================================================
  // MQTT PUBLISH
  // ====================================================

  if (
    mqttAvailable &&
    millis() - lastPublish > 5000
  ) {

    lastPublish = millis();

    // SENSOR DATA

    client.publish(
      "greenhouse/tempInside",
      String(tempInside, 1).c_str()
    );

    client.publish(
      "greenhouse/humInside",
      String(humInside, 1).c_str()
    );

    client.publish(
      "greenhouse/tempOutside",
      String(tempOutside, 1).c_str()
    );

    client.publish(
      "greenhouse/humOutside",
      String(humOutside, 1).c_str()
    );

    client.publish(
      "greenhouse/soil",
      String(soilRaw).c_str()
    );

    // DEVICE STATES

    client.publish(
      "greenhouse/exhaustFan",
      exhaustFanState ? "ON" : "OFF"
    );

    client.publish(
      "greenhouse/intakeFan",
      intakeFanState ? "ON" : "OFF"
    );

    client.publish(
      "greenhouse/window",
      windowState ? "OPEN" : "CLOSE"
    );

    client.publish(
      "greenhouse/pump",
      pumpState ? "ON" : "OFF"
    );

    client.publish(
      "greenhouse/mode",
      systemMode.c_str()
    );

    Serial.println("MQTT DATA PUBLISHED");
  }

  delay(2000);
}
