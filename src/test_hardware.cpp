#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_LSM9DS1.h>
#include <Adafruit_Sensor.h>

Adafruit_LSM9DS1 lsm = Adafruit_LSM9DS1();

#define SAMPLE_INTERVAL_MS 100   // 10 samples/sec
#define HOLD_DURATION_MS   5000  // 5 seconds per position
#define COUNTDOWN_SECS     3

void countdown(const char* positionName) {
  Serial.println("========================================");
  Serial.printf("NEXT: %s\n", positionName);
  Serial.println("========================================");
  for (int i = COUNTDOWN_SECS; i > 0; i--) {
    Serial.printf("Get ready... %d\n", i);
    delay(1000);
  }
  Serial.printf(">>> GO: %s <<<\n", positionName);
}

void collectData(const char* label) {
  unsigned long startTime = millis();
  while (millis() - startTime < HOLD_DURATION_MS) {
    sensors_event_t accel, mag, gyro, temp;
    lsm.getEvent(&accel, &mag, &gyro, &temp);

    // CSV format: label, ax, ay, az, gx, gy, gz
    Serial.printf("%s,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f\n",
      label,
      accel.acceleration.x,
      accel.acceleration.y,
      accel.acceleration.z,
      gyro.gyro.x,
      gyro.gyro.y,
      gyro.gyro.z
    );
    delay(SAMPLE_INTERVAL_MS);
  }
  Serial.printf("--- %s DONE ---\n\n", label);
}

void setup() {
  Serial.begin(115200);
  delay(2000); // Give Serial monitor time to open

  if (!lsm.begin()) {
    Serial.println("ERROR: Could not find LSM9DS1! Check wiring.");
    while (1);
  }

  lsm.setupAccel(lsm.LSM9DS1_ACCELRANGE_2G);
  lsm.setupMag(lsm.LSM9DS1_MAGGAIN_4GAUSS);
  lsm.setupGyro(lsm.LSM9DS1_GYROSCALE_245DPS);

  Serial.println("\n\n========================================");
  Serial.println("  LSM9DS1 ORIENTATION CALIBRATION TEST");
  Serial.println("========================================");
  Serial.println("Output format: label,ax,ay,az,gx,gy,gz");
  Serial.println("Starting in 3 seconds...\n");
  delay(3000);

  // --- POSITION 1: ARM UP (fingers toward ceiling) ---
  countdown("ARM UP - Point fingers toward ceiling");
  collectData("ARM_UP");

  // --- POSITION 2: ARM FORWARD (fingers toward wall) ---
  countdown("ARM FORWARD - Point fingers toward wall");
  collectData("ARM_FORWARD");

  // --- POSITION 3: ARM DOWN (fingers toward floor) ---
  countdown("ARM DOWN - Point fingers toward floor");
  collectData("ARM_DOWN");

  Serial.println("========================================");
  Serial.println("  ALL DONE - Copy everything above");
  Serial.println("  and paste it into a text file");
  Serial.println("========================================");
}

void loop() {
  // Nothing here - all logic runs once in setup
}