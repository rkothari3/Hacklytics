#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_LSM9DS1.h>
#include <Adafruit_Sensor.h>

// ── Recording configuration ──────────────────────────────────
// Change these two defines before each of the 6 recording sessions.
// ACTIVE_CLASS:    0=GOOD, 1=SLOPPY, 2=BAD
// ACTIVE_EXERCISE: 0=CURL, 1=LATERAL_RAISE
#define CLASS_GOOD              0
#define CLASS_SLOPPY            1
#define CLASS_BAD               2
#define EXERCISE_CURL           0
#define EXERCISE_LATERAL_RAISE  1

#define ACTIVE_CLASS            CLASS_BAD       // <-- change per session
#define ACTIVE_EXERCISE         EXERCISE_LATERAL_RAISE    // <-- change per session

static_assert(ACTIVE_CLASS < 3,    "ACTIVE_CLASS out of range: 0=GOOD 1=SLOPPY 2=BAD");
static_assert(ACTIVE_EXERCISE < 2, "ACTIVE_EXERCISE out of range: 0=CURL 1=LATERAL_RAISE");

// ── Detection profiles ───────────────────────────────────────
struct DetectionProfile {
  float enterThreshold;
  float exitThreshold;
  bool  enterAbove;
};

const DetectionProfile PROFILES[] = {
  // CURL: rest ay≈-7.5, top ay≈+7.3 — enter when ay drops below -0.5
  { -0.5f,  0.5f, false },
  // LATERAL_RAISE (dorsal, flipped): rest ay high, top ay low
  {  3.5f,  4.5f, false },
};

const DetectionProfile& profile = PROFILES[ACTIVE_EXERCISE];

// ── Label strings ─────────────────────────────────────────────
const char* CLASS_NAMES[]    = { "GOOD", "SLOPPY", "BAD" };
const char* EXERCISE_NAMES[] = { "CURL", "LATERAL_RAISE" };

// ── Window buffer ────────────────────────────────────────────
#define WINDOW_SIZE        50
#define SAMPLE_INTERVAL_MS 10
#define COOLDOWN_MS        800
#define PRE_SAMPLES        10

struct Sample {
  float ax, ay, az, gx, gy, gz;
};

Sample window[WINDOW_SIZE];
int    windowIdx = 0;

// Circular pre-buffer: always holds the last PRE_SAMPLES samples
// so we can backfill the window start before the peak fired
Sample preBuf[PRE_SAMPLES];
int    preBufIdx = 0;

// ── State machine ─────────────────────────────────────────────
typedef enum { IDLE, IN_REP } RepState;
RepState      repState       = IDLE;
unsigned long lastRepTime    = 0;
unsigned long lastSampleTime = 0;
uint8_t       repCount       = 0;

Adafruit_LSM9DS1 lsm = Adafruit_LSM9DS1();

void printWindow() {
  Serial.printf("%s_%s", CLASS_NAMES[ACTIVE_CLASS], EXERCISE_NAMES[ACTIVE_EXERCISE]);
  for (int i = 0; i < WINDOW_SIZE; i++) {
    Serial.printf(",%.4f,%.4f,%.4f,%.4f,%.4f,%.4f",
      window[i].ax, window[i].ay, window[i].az,
      window[i].gx, window[i].gy, window[i].gz);
  }
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  if (!lsm.begin()) {
    Serial.println("ERROR: LSM9DS1 not found.");
    while (1);
  }

  lsm.setupAccel(lsm.LSM9DS1_ACCELRANGE_2G);
  lsm.setupMag(lsm.LSM9DS1_MAGGAIN_4GAUSS);
  lsm.setupGyro(lsm.LSM9DS1_GYROSCALE_245DPS);

  Serial.printf("# DATA COLLECTION | %s_%s | Target: 50 reps\n",
    CLASS_NAMES[ACTIVE_CLASS], EXERCISE_NAMES[ACTIVE_EXERCISE]);
  Serial.println("# Each completed rep prints one CSV line.");
  Serial.println("# Lines starting with # are comments - strip them before training.");
  Serial.println("# ---");
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleTime < SAMPLE_INTERVAL_MS) return;
  lastSampleTime = now;

  sensors_event_t accel, mag, gyro, temp;
  lsm.getEvent(&accel, &mag, &gyro, &temp);

  Sample s = {
    accel.acceleration.x, accel.acceleration.y, accel.acceleration.z,
    gyro.gyro.x,          gyro.gyro.y,          gyro.gyro.z
  };

  float ay = s.ay;
  RepState prevState = repState;

  switch (repState) {
    case IDLE:
      // Always update the circular pre-buffer while idle
      preBuf[preBufIdx % PRE_SAMPLES] = s;
      preBufIdx++;

      if (profile.enterAbove ? (ay > profile.enterThreshold)
                             : (ay < profile.enterThreshold)) {
        // Copy pre-buffer into window start, oldest sample first
        for (int i = 0; i < PRE_SAMPLES; i++) {
          window[i] = preBuf[(preBufIdx + i) % PRE_SAMPLES];
        }
        windowIdx = PRE_SAMPLES;
        repState  = IN_REP;
      }
      break;

    case IN_REP:
      // Fill window with live samples
      if (windowIdx < WINDOW_SIZE) {
        window[windowIdx++] = s;
      }

      if (profile.enterAbove ? (ay < profile.exitThreshold)
                             : (ay > profile.exitThreshold)) {
        if (now - lastRepTime > COOLDOWN_MS) {
          // Pad remaining slots with last sample if rep ended before 50 samples
          while (windowIdx < WINDOW_SIZE) {
            window[windowIdx++] = s;
          }
          repCount++;
          lastRepTime = now;
          printWindow();
          Serial.printf("# REP %d recorded\n", repCount);
        }
        windowIdx = 0;
        repState  = IDLE;
      }
      break;
  }

  if (repState != prevState) {
    Serial.println(repState == IN_REP ? "# -> IN_REP" : "# -> IDLE");
  }
}
