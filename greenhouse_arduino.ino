#include <SoftwareSerial.h>

SoftwareSerial mySerial(10, 11);

// =====================================================
// RELAYS
// =====================================================

#define RELAY_EXHAUST_FAN 7     // OLD FAN (HOT AIR OUT)
#define RELAY_PUMP 5
#define RELAY_WINDOW 6
#define RELAY_INTAKE_FAN 4      // NEW FAN (AIR IN)

// =====================================================
// WINDOW TIMING
// =====================================================

unsigned long OPEN_TIME = 12500;
unsigned long CLOSE_TIME = 12500;

// =====================================================
// STATES
// =====================================================

bool windowOpened = false;

// =====================================================
// WINDOW FUNCTIONS
// =====================================================

void windowOpen() {

  if (windowOpened) {
    Serial.println("Window already OPEN");
    return;
  }

  Serial.println("WINDOW OPENING...");

  digitalWrite(RELAY_WINDOW, HIGH);

  delay(OPEN_TIME);

  digitalWrite(RELAY_WINDOW, LOW);

  windowOpened = true;

  Serial.println("WINDOW OPENED");
}

void windowClose() {

  if (!windowOpened) {
    Serial.println("Window already CLOSED");
    return;
  }

  Serial.println("WINDOW CLOSING...");

  digitalWrite(RELAY_WINDOW, HIGH);

  delay(CLOSE_TIME);

  digitalWrite(RELAY_WINDOW, LOW);

  windowOpened = false;

  Serial.println("WINDOW CLOSED");
}

// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(9600);

  mySerial.begin(9600);

  // OUTPUTS
  pinMode(RELAY_EXHAUST_FAN, OUTPUT);
  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(RELAY_WINDOW, OUTPUT);
  pinMode(RELAY_INTAKE_FAN, OUTPUT);

  // INITIAL STATE
  digitalWrite(RELAY_EXHAUST_FAN, HIGH);
  digitalWrite(RELAY_PUMP, LOW);
  digitalWrite(RELAY_WINDOW, LOW);
  digitalWrite(RELAY_INTAKE_FAN, HIGH);

  Serial.println("SMART GREENHOUSE READY");
}

// =====================================================
// LOOP
// =====================================================

void loop() {

  if (mySerial.available()) {

    String cmd = mySerial.readStringUntil('\n');

    cmd.trim();

    Serial.print("CMD RECEIVED: ");
    Serial.println(cmd);

    // =================================================
    // WINDOW
    // =================================================

    if (cmd == "WINDOW_OPEN") {

      windowOpen();
    }

    else if (cmd == "WINDOW_CLOSE") {

      windowClose();
    }

    // =================================================
    // EXHAUST FAN (HOT AIR OUTSIDE)
    // =================================================

    else if (cmd == "FAN_ON") {

      digitalWrite(RELAY_EXHAUST_FAN, LOW);

      Serial.println("EXHAUST FAN ON");
    }

    else if (cmd == "FAN_OFF") {

      digitalWrite(RELAY_EXHAUST_FAN, HIGH);

      Serial.println("EXHAUST FAN OFF");
    }

    // =================================================
    // INTAKE FAN (AIR INSIDE)
    // =================================================

    else if (cmd == "INTAKE_ON") {

      digitalWrite(RELAY_INTAKE_FAN, LOW);

      Serial.println("INTAKE FAN ON");
    }

    else if (cmd == "INTAKE_OFF") {

      digitalWrite(RELAY_INTAKE_FAN, HIGH);

      Serial.println("INTAKE FAN OFF");
    }

    // =================================================
    // WATER PUMP
    // =================================================

    else if (cmd == "PUMP_ON") {

      digitalWrite(RELAY_PUMP, HIGH);

      Serial.println("PUMP ON");
    }

    else if (cmd == "PUMP_OFF") {

      digitalWrite(RELAY_PUMP, LOW);

      Serial.println("PUMP OFF");
    }

    // =================================================
    // UNKNOWN COMMAND
    // =================================================

    else {

      Serial.println("UNKNOWN COMMAND");
    }
  }
}
