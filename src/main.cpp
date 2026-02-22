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
// Change ACTIVE_EXERCISE before flashing to switch exercises.
#define EXERCISE_CURL          0
#define EXERCISE_LATERAL_RAISE 1
#define ACTIVE_EXERCISE        EXERCISE_LATERAL_RAISE

// ── Detection profile ────────────────────────────────────────
struct DetectionProfile {
  float enterThreshold;  // ay value that triggers IDLE → IN_REP
  float exitThreshold;   // ay value that triggers IN_REP → IDLE + fires rep
  bool  enterAbove;      // true = enter when ay > threshold
  float minDepth;        // ay must reach below this value (enterAbove=false) during IN_REP
                         // for the rep to count — filters half-range reps at hardware level
};

const DetectionProfile PROFILES[] = {
    // CURL: rest ay≈+1.9, bottom ay≈-8.0
    // GOOD bottoms out at min -5.8; sloppy reps peak at -3.0 at best → gate at -4.5
    {-0.5f, 0.5f, false, -4.5f},
    // LATERAL_RAISE (dorsal): rest ay≈+5.8, bottom ay≈-1.3
    // GOOD bottoms at max 0.3; sloppy reps only reach 3.5 at best → gate at 1.5
    {3.5f, 4.5f, false, 1.5f},
};

static_assert(ACTIVE_EXERCISE < 2, "ACTIVE_EXERCISE out of range — valid: 0=CURL, 1=LATERAL_RAISE");
const DetectionProfile& profile = PROFILES[ACTIVE_EXERCISE];

// ── BLE UUIDs ────────────────────────────────────────────────
// One service, two characteristics:
//   REP_CHAR  — notifies once per rep; 1-byte rep count (kept for simple consumers)
//   WIN_CHAR  — carries the raw 50×6 float window in 180-byte chunks before the rep notify

#define SERVICE_UUID  "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define REP_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // existing — unchanged
#define WIN_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a9"  // new — window chunks

// ── Window chunking ──────────────────────────────────────────
// 50 timesteps × 6 channels × 4 bytes = 1200 bytes per rep.
// BLE MTU is negotiated; we stay conservative at 180 bytes/chunk
// so we never exceed even the default 185-byte effective payload.
// 1200 / 180 = 6.67 → 7 chunks (last chunk is shorter: 60 bytes).
//
// Chunk packet layout (185 bytes max):
//   byte 0:   chunk index (0-based)
//   byte 1:   total chunks for this rep
//   bytes 2…: float32 payload (little-endian)

#define WINDOW_SIZE    50
#define N_CHANNELS     6  // ax, ay, az, gx, gy, gz
#define FLOATS_PER_REP (WINDOW_SIZE * N_CHANNELS)  // 300
#define BYTES_PER_REP  (FLOATS_PER_REP * 4)        // 1200
#define CHUNK_FLOATS   45  // 45 floats × 4 = 180 bytes of payload per chunk
#define TOTAL_CHUNKS   ((FLOATS_PER_REP + CHUNK_FLOATS - 1) / CHUNK_FLOATS)  // = 7

// ── Sampling ─────────────────────────────────────────────────
#define SAMPLE_INTERVAL_MS 10  // 100 Hz
#define COOLDOWN_MS        800
#define PRE_SAMPLES        10  // pre-buffer size (captured before enter-threshold fires)

struct Sample {
  float ax, ay, az, gx, gy, gz;
};

Sample window[WINDOW_SIZE];
int windowIdx = 0;

Sample preBuf[PRE_SAMPLES];
int preBufIdx = 0;

// ── State machine ─────────────────────────────────────────────
typedef enum { IDLE, IN_REP } RepState;
RepState      repState       = IDLE;
unsigned long lastRepTime    = 0;
unsigned long lastSampleTime = 0;
uint8_t       repCount       = 0;
float         repMinAy       = 0.0f;  // tracks deepest ay seen during current IN_REP

// ── BLE handles ──────────────────────────────────────────────
BLECharacteristic* pRepChar = nullptr;
BLECharacteristic* pWinChar = nullptr;
volatile bool deviceConnected = false;

class WonkaServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("BLE: phone connected");
  }
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("BLE: phone disconnected — restarting advertising");
    pServer->startAdvertising();
  }
};

// ── Send window over BLE ──────────────────────────────────────
// Serialises the window[] array into TOTAL_CHUNKS notify packets on WIN_CHAR,
// then fires one notify on REP_CHAR with the updated rep count.
// Called synchronously when a rep completes — loop() is blocked for ~7 BLE writes
// which takes <5 ms at 1 Mbps; negligible at 100 Hz sampling.
void sendRepWindow() {
  // Flatten window into a float array
  float flat[FLOATS_PER_REP];
  for (int i = 0; i < WINDOW_SIZE; i++) {
    flat[i * N_CHANNELS + 0] = window[i].ax;
    flat[i * N_CHANNELS + 1] = window[i].ay;
    flat[i * N_CHANNELS + 2] = window[i].az;
    flat[i * N_CHANNELS + 3] = window[i].gx;
    flat[i * N_CHANNELS + 4] = window[i].gy;
    flat[i * N_CHANNELS + 5] = window[i].gz;
  }

  // Send chunks: [chunkIdx, totalChunks, ...floats as raw bytes...]
  uint8_t pkt[2 + CHUNK_FLOATS * 4];

  for (int chunk = 0; chunk < TOTAL_CHUNKS; chunk++) {
    int floatStart = chunk * CHUNK_FLOATS;
    int floatEnd   = min(floatStart + CHUNK_FLOATS, FLOATS_PER_REP);
    int nFloats    = floatEnd - floatStart;

    pkt[0] = (uint8_t)chunk;
    pkt[1] = (uint8_t)TOTAL_CHUNKS;
    memcpy(pkt + 2, flat + floatStart, nFloats * sizeof(float));

    pWinChar->setValue(pkt, 2 + nFloats * sizeof(float));
    pWinChar->notify();
  }

  // After window is fully delivered, fire the rep-count notify
  pRepChar->setValue(&repCount, 1);
  pRepChar->notify();

  Serial.printf("REP %d sent (%d chunks, %d bytes)\n", repCount, TOTAL_CHUNKS, BYTES_PER_REP);
}

// ── Setup ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(2000);

  if (!lsm.begin()) {
    Serial.println("ERROR: LSM9DS1 not found. Check wiring.");
    while (1)
      ;
  }

  lsm.setupAccel(lsm.LSM9DS1_ACCELRANGE_2G);
  lsm.setupMag(lsm.LSM9DS1_MAGGAIN_4GAUSS);
  lsm.setupGyro(lsm.LSM9DS1_GYROSCALE_245DPS);

  const char* exName = (ACTIVE_EXERCISE == EXERCISE_CURL) ? "CURL" : "LATERAL_RAISE";
  Serial.printf("Exercise: %s | Ready.\n", exName);

  // BLE
  BLEDevice::init("WonkaLift");
  BLEServer* pServer = BLEDevice::createServer();
  pServer->setCallbacks(new WonkaServerCallbacks());

  BLEService* pService = pServer->createService(BLEUUID(SERVICE_UUID), 12);  // handle count

  // Rep-count characteristic (legacy, 1 byte)
  pRepChar = pService->createCharacteristic(
      REP_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pRepChar->setValue(&repCount, 1);
  pRepChar->addDescriptor(new BLE2902());

  // Window characteristic (chunked IMU data, notify-only)
  pWinChar = pService->createCharacteristic(WIN_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  pWinChar->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("BLE advertising as 'WonkaLift'");
}

// ── Loop ──────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();
  if (now - lastSampleTime < SAMPLE_INTERVAL_MS) return;
  lastSampleTime = now;

  sensors_event_t accel, mag, gyro, temp;
  lsm.getEvent(&accel, &mag, &gyro, &temp);

  Sample s = {accel.acceleration.x, accel.acceleration.y, accel.acceleration.z,
              gyro.gyro.x,          gyro.gyro.y,          gyro.gyro.z};

  float ay = s.ay;
  RepState prevState = repState;

  switch (repState) {
    case IDLE:
      // Keep rolling pre-buffer while at rest
      preBuf[preBufIdx % PRE_SAMPLES] = s;
      preBufIdx++;

      if (profile.enterAbove ? (ay > profile.enterThreshold) : (ay < profile.enterThreshold)) {
        // Seed window with the pre-buffer (oldest sample first)
        for (int i = 0; i < PRE_SAMPLES; i++) {
          window[i] = preBuf[(preBufIdx + i) % PRE_SAMPLES];
        }
        windowIdx = PRE_SAMPLES;
        repMinAy  = ay;  // seed with the triggering sample
        repState  = IN_REP;
      }
      break;

    case IN_REP:
      // Track deepest ay reached (enterAbove=false means lower = deeper)
      if (ay < repMinAy) repMinAy = ay;

      // Collect live samples into the window
      if (windowIdx < WINDOW_SIZE) {
        window[windowIdx++] = s;
      }

      if (profile.enterAbove ? (ay < profile.exitThreshold) : (ay > profile.exitThreshold)) {
        if (now - lastRepTime > COOLDOWN_MS) {
          // Only count the rep if the arm reached the required depth
          if (repMinAy < profile.minDepth) {
            // Pad any remaining slots with the last sample
            while (windowIdx < WINDOW_SIZE) {
              window[windowIdx++] = s;
            }
            repCount++;
            lastRepTime = now;

            if (deviceConnected) {
              sendRepWindow();
            } else {
              Serial.printf("REP %d (no phone connected)\n", repCount);
            }
          } else {
            Serial.printf("REP IGNORED — insufficient depth (minAy=%.2f, required<%.2f)\n",
                          repMinAy, profile.minDepth);
          }
        }
        windowIdx = 0;
        repState  = IDLE;
      }
      break;
  }

  if (repState != prevState) {
    Serial.println(repState == IN_REP ? "-> IN_REP" : "-> IDLE");
  }
}
