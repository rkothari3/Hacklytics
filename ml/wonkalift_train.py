# Databricks notebook source
# WonkaLift — 1D CNN Form Classifier Training Pipeline
# =====================================================
# Trains a 3-class form quality classifier (GOOD / SLOPPY / BAD)
# on bicep curl and lateral raise IMU windows.
#
# HOW TO USE:
#   1. Run Cell 1 to install dependencies (restart kernel when prompted)
#   2. Run all remaining cells in order
#   3. While using dummy data: pipeline runs end-to-end, model accuracy will be ~33% (random)
#   4. Once you have real CSVs: upload them to FileStore and set USE_DUMMY_DATA = False

# COMMAND ----------
# Cell 1 — Install dependencies
%pip install tensorflow scikit-learn seaborn

# COMMAND ----------
# Cell 2 — Imports
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import os

print("All imports OK")
print(f"TF: {tf.__version__} | NumPy: {np.__version__}")

# COMMAND ----------
# Cell 3 — Configuration
# ─────────────────────────────────────────────────────────────
# Set USE_DUMMY_DATA = False once your 6 CSV files are uploaded
# to Databricks FileStore at /FileStore/wonkalift/
# ─────────────────────────────────────────────────────────────

USE_DUMMY_DATA = True   # <-- flip to False when real CSVs are ready

# Label mapping
LABELS    = ["GOOD", "SLOPPY", "BAD"]
EXERCISES = ["CURL", "LATERAL_RAISE"]

# Model input shape: 50 timesteps × 6 channels (ax,ay,az,gx,gy,gz)
WINDOW_SIZE  = 50
N_CHANNELS   = 6
N_CLASSES    = 3
REPS_PER_CLASS = 50   # 50 reps × 3 classes × 2 exercises = 300 total

# FileStore paths (only used when USE_DUMMY_DATA = False)
DATA_DIR = "/dbfs/FileStore/wonkalift"

print(f"Mode: {'DUMMY DATA' if USE_DUMMY_DATA else 'REAL DATA'}")
print(f"Input shape: ({WINDOW_SIZE}, {N_CHANNELS}) → {N_CLASSES} classes")

# COMMAND ----------
# Cell 4 — Load data

def load_real_data():
    """
    Load the 6 CSV files from Databricks FileStore.
    Each file: 50 rows × 301 columns (label + 300 floats)
    Column format: LABEL_EXERCISE, ax0, ay0, az0, gx0, gy0, gz0, ax1, ...
    """
    all_X = []
    all_y = []

    for exercise in EXERCISES:
        for label_idx, label in enumerate(LABELS):
            filename = f"{label}_{exercise}.csv"
            filepath = os.path.join(DATA_DIR, filename)

            df = pd.read_csv(filepath, header=None)
            print(f"Loaded {filepath}: {df.shape}")

            # First column is the label string — drop it
            # Remaining 300 columns = 50 timesteps × 6 channels
            values = df.iloc[:, 1:].values.astype(np.float32)
            X = values.reshape(-1, WINDOW_SIZE, N_CHANNELS)

            all_X.append(X)
            all_y.extend([label_idx] * len(X))

    X = np.concatenate(all_X, axis=0)
    y = np.array(all_y, dtype=np.int32)
    print(f"\nTotal dataset: X={X.shape}, y={y.shape}")
    return X, y


def generate_dummy_data():
    """
    Generates 300 synthetic IMU windows (50 reps × 3 classes × 2 exercises).
    Each class has slightly different signal characteristics so the model
    has something to learn — but accuracy will still be low (~50-60%).
    Use this only to verify the pipeline works end-to-end.
    """
    np.random.seed(42)
    all_X = []
    all_y = []

    for exercise_idx, exercise in enumerate(EXERCISES):
        for label_idx, label in enumerate(LABELS):
            reps = []
            for _ in range(REPS_PER_CLASS):
                t = np.linspace(0, 1, WINDOW_SIZE)

                if label == "GOOD":
                    # Clean sinusoidal motion, full amplitude
                    ay = 8.0 * np.sin(2 * np.pi * t) + np.random.normal(0, 0.3, WINDOW_SIZE)
                    gx = 1.5 * np.sin(2 * np.pi * t + 0.5) + np.random.normal(0, 0.1, WINDOW_SIZE)
                elif label == "SLOPPY":
                    # Half amplitude — partial range of motion
                    ay = 4.0 * np.sin(2 * np.pi * t) + np.random.normal(0, 0.3, WINDOW_SIZE)
                    gx = 0.8 * np.sin(2 * np.pi * t + 0.5) + np.random.normal(0, 0.1, WINDOW_SIZE)
                else:  # BAD
                    # High gyro spike — body swing
                    ay = 5.0 * np.sin(2 * np.pi * t) + np.random.normal(0, 0.5, WINDOW_SIZE)
                    gx = 4.0 * np.sin(2 * np.pi * t + 0.3) + np.random.normal(0, 0.5, WINDOW_SIZE)

                # Fill remaining channels with low noise
                ax = np.random.normal(0.5 * exercise_idx, 0.2, WINDOW_SIZE)
                az = np.random.normal(-5.0, 0.3, WINDOW_SIZE)
                gy = np.random.normal(0, 0.2, WINDOW_SIZE)
                gz = np.random.normal(0, 0.2, WINDOW_SIZE)

                window = np.stack([ax, ay, az, gx, gy, gz], axis=1)  # (50, 6)
                reps.append(window)

            all_X.append(np.array(reps))
            all_y.extend([label_idx] * REPS_PER_CLASS)

    X = np.concatenate(all_X, axis=0).astype(np.float32)
    y = np.array(all_y, dtype=np.int32)
    print(f"Dummy dataset: X={X.shape}, y={y.shape}")
    print("Label distribution:", {LABELS[i]: int(np.sum(y == i)) for i in range(N_CLASSES)})
    return X, y


if USE_DUMMY_DATA:
    X, y = generate_dummy_data()
else:
    X, y = load_real_data()

# COMMAND ----------
# Cell 5 — Preprocess: normalize + one-hot encode

# Normalize each channel to zero mean, unit variance across the dataset
# This is important — accel values (~9.8 m/s²) and gyro values (~1 rad/s)
# are on very different scales. Normalization prevents the model from
# ignoring the gyro channels just because they're smaller numbers.
X_mean = X.mean(axis=(0, 1), keepdims=True)
X_std  = X.std(axis=(0, 1), keepdims=True) + 1e-8  # epsilon prevents division by zero

X_norm = (X - X_mean) / X_std

# One-hot encode labels: [0,1,2] → [[1,0,0],[0,1,0],[0,0,1]]
y_onehot = keras.utils.to_categorical(y, num_classes=N_CLASSES)

print(f"X_norm shape: {X_norm.shape} | range: [{X_norm.min():.2f}, {X_norm.max():.2f}]")
print(f"y_onehot shape: {y_onehot.shape}")
print(f"X_mean: {X_mean.squeeze()}")
print(f"X_std:  {X_std.squeeze()}")

# Save normalization stats — needed at inference time on the phone
np.save("/tmp/X_mean.npy", X_mean)
np.save("/tmp/X_std.npy",  X_std)
print("\nNormalization stats saved to /tmp/")

# COMMAND ----------
# Cell 6 — Train/test split (80/20, stratified)

X_train, X_test, y_train, y_test = train_test_split(
    X_norm, y_onehot,
    test_size=0.2,
    random_state=42,
    stratify=y  # ensures each class is proportionally represented in both splits
)

print(f"Train: {X_train.shape} | Test: {X_test.shape}")
print(f"Train label distribution: {y_train.sum(axis=0).astype(int)}")
print(f"Test  label distribution: {y_test.sum(axis=0).astype(int)}")

# COMMAND ----------
# Cell 7 — Define 1D CNN model
#
# Architecture explanation:
#   Input: (50, 6) — 50 timesteps, 6 IMU channels
#
#   Conv1D layers scan across the time dimension with learned filters.
#   Each filter learns to detect a specific temporal pattern (e.g. a sharp
#   gyro spike = body swing, a truncated amplitude = partial ROM).
#
#   BatchNorm stabilizes training. Dropout prevents overfitting on 300 samples.
#
#   GlobalAveragePooling collapses the time dimension — the model becomes
#   position-invariant (it doesn't care where in the window the pattern occurs).
#
#   Final Dense(3) + softmax → probabilities for GOOD, SLOPPY, BAD.

def build_model(input_shape=(WINDOW_SIZE, N_CHANNELS), n_classes=N_CLASSES):
    inputs = keras.Input(shape=input_shape)

    # Block 1
    x = layers.Conv1D(32, kernel_size=5, padding="same", activation="relu")(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling1D(pool_size=2)(x)

    # Block 2
    x = layers.Conv1D(64, kernel_size=3, padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling1D(pool_size=2)(x)

    # Block 3
    x = layers.Conv1D(64, kernel_size=3, padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)

    # Collapse time dimension
    x = layers.GlobalAveragePooling1D()(x)

    # Classifier head
    x = layers.Dense(64, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(n_classes, activation="softmax")(x)

    model = keras.Model(inputs, outputs)
    return model

model = build_model()
model.summary()

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=1e-3),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

# COMMAND ----------
# Cell 8 — Train

EPOCHS     = 60
BATCH_SIZE = 16

# Early stopping: stops training if val_loss hasn't improved for 10 epochs
# Restores the best weights automatically
early_stop = keras.callbacks.EarlyStopping(
    monitor="val_loss",
    patience=10,
    restore_best_weights=True,
    verbose=1
)

history = model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=[early_stop],
    verbose=1
)

# Plot training curves
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

ax1.plot(history.history["loss"],     label="train loss")
ax1.plot(history.history["val_loss"], label="val loss")
ax1.set_title("Loss"); ax1.legend()

ax2.plot(history.history["accuracy"],     label="train acc")
ax2.plot(history.history["val_accuracy"], label="val acc")
ax2.set_title("Accuracy"); ax2.legend()

plt.tight_layout()
plt.show()

# COMMAND ----------
# Cell 9 — Evaluate + confusion matrix

y_pred_probs = model.predict(X_test)
y_pred       = np.argmax(y_pred_probs, axis=1)
y_true       = np.argmax(y_test,       axis=1)

print("\nClassification Report:")
print(classification_report(y_true, y_pred, target_names=LABELS))

cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=LABELS, yticklabels=LABELS)
plt.title("Confusion Matrix")
plt.ylabel("True Label")
plt.xlabel("Predicted Label")
plt.tight_layout()
plt.show()

# COMMAND ----------
# Cell 10 — Export to TFLite
#
# TFLite is a compressed, inference-only format designed for mobile/embedded.
# The converter takes your trained Keras model and produces a .tflite flatbuffer
# that can be bundled into the React Native app and run on-device with no internet.
#
# We also apply FLOAT16 quantization — this halves the model size with minimal
# accuracy loss. Fine for a 3-class classifier on structured sensor data.

converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_types = [tf.float16]

tflite_model = converter.convert()

# Save locally on the cluster
tflite_path = "/tmp/wonkalift_classifier.tflite"
with open(tflite_path, "wb") as f:
    f.write(tflite_model)

size_kb = len(tflite_model) / 1024
print(f"TFLite model saved: {tflite_path}")
print(f"Model size: {size_kb:.1f} KB")

# Also copy to FileStore so you can download it from the Databricks UI
dbfs_tflite_path = "/dbfs/FileStore/wonkalift/wonkalift_classifier.tflite"
dbfs_mean_path   = "/dbfs/FileStore/wonkalift/X_mean.npy"
dbfs_std_path    = "/dbfs/FileStore/wonkalift/X_std.npy"

os.makedirs("/dbfs/FileStore/wonkalift", exist_ok=True)

with open(dbfs_tflite_path, "wb") as f:
    f.write(tflite_model)

import shutil
shutil.copy("/tmp/X_mean.npy", dbfs_mean_path)
shutil.copy("/tmp/X_std.npy",  dbfs_std_path)

print(f"\nFiles saved to FileStore (downloadable from Databricks UI):")
print(f"  {dbfs_tflite_path}")
print(f"  {dbfs_mean_path}")
print(f"  {dbfs_std_path}")
print("\nDone! Download wonkalift_classifier.tflite and bundle it into the React Native app.")
