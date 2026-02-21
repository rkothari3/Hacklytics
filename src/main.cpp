#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_LSM9DS1.h>
#include <Adafruit_Sensor.h>

Adafruit_LSM9DS1 lsm = Adafruit_LSM9DS1();

#define SAMPLE_INTERVAL_MS 10   // 100Hz
#define PEAK_THRESHOLD     0.0f // m/s² — zero crossing (rest=+8.4, peak=-8.7)
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
  Serial.println("Format: millis,ay,state");
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleTime < SAMPLE_INTERVAL_MS) return;
  lastSampleTime = now;

  sensors_event_t accel, mag, gyro, temp;
  lsm.getEvent(&accel, &mag, &gyro, &temp);

  float ay = accel.acceleration.y;

  switch (repState) {
    case IDLE:
      // Wait for ay to drop below threshold (arm curling up)
      if (ay < PEAK_THRESHOLD) {
        repState = IN_REP;
      }
      break;

    case IN_REP:
      // Wait for ay to rise back above threshold (arm lowering)
      if (ay > PEAK_THRESHOLD) {
        if (now - lastRepTime > COOLDOWN_MS) {
          repCount++;
          lastRepTime = now;
          Serial.printf(">>> REP %d DETECTED! (ay=%.2f)\n", repCount, ay);
          // BLE notify placeholder — Task 3
        }
        repState = IDLE;
      }
      break;
  }

  // Continuous debug output for tuning
  Serial.printf("%lu,%.3f,%s\n", now, ay, repState == IDLE ? "IDLE" : "IN_REP");
}
