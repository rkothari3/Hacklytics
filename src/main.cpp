#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_LSM9DS1.h>
#include <Adafruit_Sensor.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

Adafruit_LSM9DS1 lsm = Adafruit_LSM9DS1();

// BLE
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

#define SAMPLE_INTERVAL_MS 10   // 100Hz
#define THRESHOLD_ENTER   -0.5f // m/s² — enter IN_REP (arm curling up past this)
#define THRESHOLD_EXIT     0.5f // m/s² — exit IN_REP (arm lowering past this)
// Hysteresis band ±0.5f around zero prevents phantom toggling near the crossing
#define COOLDOWN_MS        800  // minimum ms between reps (fast curls ~1s)

typedef enum { IDLE, IN_REP } RepState;

RepState repState = IDLE;
unsigned long lastRepTime = 0;
unsigned long lastSampleTime = 0;
uint8_t repCount = 0;

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

  Serial.println("Peak detector ready. Do curls.");

  // BLE setup
  BLEDevice::init("WonkaLift");
  BLEServer* pServer = BLEDevice::createServer();
  pServer->setCallbacks(new WonkaServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  pRepCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pRepCharacteristic->setValue(&repCount, 1);  // initial value = 0
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
      if (ay < THRESHOLD_ENTER) {
        repState = IN_REP;
      }
      break;

    case IN_REP:
      if (ay > THRESHOLD_EXIT) {
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

  // Only print on state transitions
  if (repState != prevState) {
    Serial.println(repState == IN_REP ? "-> IN_REP" : "-> IDLE");
  }
}
