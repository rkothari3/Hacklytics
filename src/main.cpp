#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_LSM9DS1.h>
#include <Adafruit_Sensor.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

Adafruit_LSM9DS1 lsm = Adafruit_LSM9DS1();

// ── Exercise selection ───────────────────────────────────────
// Change ACTIVE_EXERCISE before flashing to switch exercises
#define EXERCISE_CURL           0
#define EXERCISE_LATERAL_RAISE  1
#define ACTIVE_EXERCISE         EXERCISE_CURL

// ── Detection profile ────────────────────────────────────────
struct DetectionProfile {
  float enterThreshold;  // ay value that triggers IDLE → IN_REP
  float exitThreshold;   // ay value that triggers IN_REP → IDLE + rep count
  bool  enterAbove;      // true = enter when ay > threshold, false = enter when ay < threshold
};

const DetectionProfile PROFILES[] = {
  // CURL: rest ay≈-7.5, top ay≈+7.3 — enter when ay drops below -0.5
  { -0.5f,  0.5f, false },
  // LATERAL_RAISE: rest ay≈-1.1, top ay≈+7.8 — enter when ay rises above 3.5
  {  3.5f,  2.5f, true  },
};

const DetectionProfile& profile = PROFILES[ACTIVE_EXERCISE];

// ── BLE ──────────────────────────────────────────────────────
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLECharacteristic* pRepCharacteristic = nullptr;
volatile bool deviceConnected = false;

class WonkaServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("BLE: Phone connected!");
  }
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("BLE: Phone disconnected. Restarting advertising...");
    pServer->startAdvertising();
  }
};

// ── Sampling + detection ─────────────────────────────────────
#define SAMPLE_INTERVAL_MS 10
#define COOLDOWN_MS        800

typedef enum { IDLE, IN_REP } RepState;

RepState      repState       = IDLE;
unsigned long lastRepTime    = 0;
unsigned long lastSampleTime = 0;
uint8_t       repCount       = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);

  if (!lsm.begin()) {
    Serial.println("ERROR: LSM9DS1 not found. Check wiring.");
    while (1);
  }

  lsm.setupAccel(lsm.LSM9DS1_ACCELRANGE_2G);
  lsm.setupMag(lsm.LSM9DS1_MAGGAIN_4GAUSS);
  lsm.setupGyro(lsm.LSM9DS1_GYROSCALE_245DPS);

  const char* exName = (ACTIVE_EXERCISE == EXERCISE_CURL) ? "CURL" : "LATERAL_RAISE";
  Serial.printf("Exercise: %s | Ready. Do reps.\n", exName);

  // BLE setup
  BLEDevice::init("WonkaLift");
  BLEServer* pServer = BLEDevice::createServer();
  pServer->setCallbacks(new WonkaServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  pRepCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pRepCharacteristic->setValue(&repCount, 1);
  pRepCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("BLE advertising as 'WonkaLift'");
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleTime < SAMPLE_INTERVAL_MS) return;
  lastSampleTime = now;

  sensors_event_t accel, mag, gyro, temp;
  lsm.getEvent(&accel, &mag, &gyro, &temp);

  float ay = accel.acceleration.y;
  RepState prevState = repState;

  switch (repState) {
    case IDLE:
      if (profile.enterAbove ? (ay > profile.enterThreshold)
                             : (ay < profile.enterThreshold)) {
        repState = IN_REP;
      }
      break;

    case IN_REP:
      if (profile.enterAbove ? (ay < profile.exitThreshold)
                             : (ay > profile.exitThreshold)) {
        if (now - lastRepTime > COOLDOWN_MS) {
          repCount++;
          lastRepTime = now;
          Serial.printf("REP %d\n", repCount);
          if (deviceConnected) {
            pRepCharacteristic->setValue(&repCount, 1);
            pRepCharacteristic->notify();
          }
        }
        repState = IDLE;
      }
      break;
  }

  if (repState != prevState) {
    Serial.println(repState == IN_REP ? "-> IN_REP" : "-> IDLE");
  }
}
