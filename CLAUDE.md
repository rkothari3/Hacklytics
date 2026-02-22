WonkaLift — Project Overview
What We're Building
WonkaLift is a smart fitness wristband system that uses real-time motion sensing to coach athletes on rep quality during strength training. The core insight is simple: most people quit the gym because they don't see results fast enough, and most don't see results because they're training with bad form and wrong tempo. WonkaLift solves this by strapping a sensor to your wrist, analyzing every rep you do, and gamifying the feedback through a Willy Wonka-themed experience — because consistency without fun doesn't last either.
The hardware is an ESP32 microcontroller paired with an LSM9DS1 9-DOF IMU mounted on the wrist. It captures accelerometer and gyroscope data at 100Hz, detects rep completion on-device, and fires a single BLE packet per rep to the user's iPhone. The iPhone runs all ML inference locally, displays real-time feedback through a Wonka-themed game UI, and at the end of each session ships the workout data to a cloud backend for analytics and strength projection.

Features
Rep Detection — The ESP32 performs peak detection on the Y-axis accelerometer signal. Every completed rep triggers one BLE packet containing the raw IMU window for that rep. No continuous streaming, no BLE flooding.
Tempo Tracking — The app measures time between rep peaks to calculate concentric and eccentric phase durations. Each rep is scored against scientifically validated Time Under Tension targets and flagged as on-pace, too fast, or too slow.
Form Classification — A TFLite model running on-device classifies each rep's IMU window into one of three form quality classes: GOOD, SLOPPY (minor deviation — partial range of motion or slight momentum), or BAD (clear breakdown — swinging, no control, wrong plane). The model is trained on bicep curls and lateral raises — the two exercises supported in v1. The user manually selects their exercise before starting a set, so the model focuses entirely on form quality rather than exercise identification.
Wonka River Game UI — The core workout screen is a side-scrolling chocolate river game. Wonka's boat moves through a channel whose walls respond to your rep quality. Good form and good tempo keeps the boat centered and the channel wide. Bad reps cause wall collisions, screen shake, and Oompa Loompa sound effects. At the end of a set, hitting above 80% good reps awards a Golden Ticket. Below that, the factory rejects you. A session leaderboard tracks Golden Tickets across users.
Strength Projection — After each session, the app displays a projection chart showing estimated 1RM progression over 8 weeks based on current performance. Projections use the Brzycki formula for 1RM estimation and apply a quality multiplier derived from your average form and tempo scores — better training quality accelerates the projected progression curve.
Session Analytics Dashboard — Historical session data pulled from Snowflake powers a post-workout dashboard showing tempo score trends, form quality over time, rep volume, and percentile benchmarking against the OpenPowerlifting public dataset.

Tech Stack
Hardware

ESP32 (microcontroller + BLE radio)
LSM9DS1 (9-DOF IMU — accelerometer, gyroscope, magnetometer)
Breadboard + powerbank (5V/2.1A)
Arduino C++ firmware with Adafruit LSM9DS1 library

Mobile App

React Native (iOS)
react-native-ble-plx for BLE communication
@tensorflow/tfjs-react-native + TFLite for on-device inference
React Context API for global state management
React Native Animated API for the Wonka game UI
react-native-chart-kit for analytics dashboard charts
ElevenLabs API for real-time voice coaching feedback

ML

Training: Python + TensorFlow/Keras on Databricks
Architecture: 1D CNN — input shape (50, 6) representing 50 timesteps of ax, ay, az, gx, gy, gz
Output: 3-class form classifier (GOOD / SLOPPY / BAD) per exercise
Training data: Self-collected — 50 good + 50 sloppy + 50 bad reps × 2 exercises = 300 labeled reps
Export: TFLite flatbuffer bundled into the React Native app assets

Backend + Data

Snowflake as the session data warehouse — written to directly from the app via Snowflake REST API after each workout
Databricks for model training pipeline and experiment tracking


Random Notes
- To train w/ dummy data: python ml/train_local.py
- With real data after collected 6 csv files: python ml/train_local.py --real