#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_LSM9DS1.h>
#include <Adafruit_Sensor.h>

Adafruit_LSM9DS1 lsm = Adafruit_LSM9DS1();

#define SAMPLE_INTERVAL_MS 10  // 100Hz

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

  Serial.println("IMU ready. Watching accel.y...");
}

void loop() {
  sensors_event_t accel, mag, gyro, temp;
  lsm.getEvent(&accel, &mag, &gyro, &temp);

  // Print accel.y so you can eyeball peak values during curls
  Serial.printf("ay=%.3f\n", accel.acceleration.y);

  delay(SAMPLE_INTERVAL_MS);
}
