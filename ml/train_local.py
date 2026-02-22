#!/usr/bin/env python3
"""
WonkaLift — Local 1D CNN Form Classifier Training
==================================================
Standalone script (no Databricks needed).
Trains a 3-class form quality classifier (GOOD / SLOPPY / BAD)
and exports:
    ml/wonkalift_classifier.tflite
    ml/X_mean.npy
    ml/X_std.npy

Usage:
    python ml/train_local.py              # train on dummy data
    python ml/train_local.py --real       # train on real CSVs in ml/data/
"""

import argparse
import os
import sys

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report

# ── Config ──────────────────────────────────────────────────────────────────
LABELS = ["GOOD", "SLOPPY", "BAD"]
EXERCISES = ["CURL", "LATERAL_RAISE"]
WINDOW_SIZE = 50
N_CHANNELS = 6
N_CLASSES = 3
REPS_PER_CLASS = 50   # per exercise

EPOCHS = 60
BATCH_SIZE = 16

# Output dir = same directory as this script (ml/)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")


# ── Data loading ────────────────────────────────────────────────────────────

def load_real_data():
        """
        Load 6 CSV files from ml/data/.
        Each file: N rows × 301 columns (label_string, then 300 floats).
        Filename format: GOOD_CURL.csv, SLOPPY_LATERAL_RAISE.csv, etc.
        """
        import pandas as pd

        all_X, all_y = [], []
        for exercise in EXERCISES:
                for label_idx, label in enumerate(LABELS):
                        filename = f"{label}_{exercise}.csv"
                        filepath = os.path.join(DATA_DIR, filename)
                        if not os.path.exists(filepath):
                                sys.exit(f"ERROR: Missing data file: {filepath}")

                        df = pd.read_csv(filepath, header=None)
                        print(f"  Loaded {filepath}: {df.shape}")

                        values = df.iloc[:, 1:].values.astype(np.float32)
                        X = values.reshape(-1, WINDOW_SIZE, N_CHANNELS)
                        all_X.append(X)
                        all_y.extend([label_idx] * len(X))

        X = np.concatenate(all_X, axis=0)
        y = np.array(all_y, dtype=np.int32)
        print(f"  Total: X={X.shape}, y={y.shape}")
        return X, y


def generate_dummy_data():
        """
        300 synthetic IMU windows with class-distinctive signal patterns.
        """
        np.random.seed(42)
        all_X, all_y = [], []

        for exercise_idx, exercise in enumerate(EXERCISES):
                for label_idx, label in enumerate(LABELS):
                        reps = []
                        for _ in range(REPS_PER_CLASS):
                                t = np.linspace(0, 1, WINDOW_SIZE)

                                if label == "GOOD":
                                        ay = 8.0 * np.sin(2 * np.pi * t) + np.random.normal(0, 0.3, WINDOW_SIZE)
                                        gx = 1.5 * np.sin(2 * np.pi * t + 0.5) + np.random.normal(0, 0.1, WINDOW_SIZE)
                                elif label == "SLOPPY":
                                        ay = 4.0 * np.sin(2 * np.pi * t) + np.random.normal(0, 0.3, WINDOW_SIZE)
                                        gx = 0.8 * np.sin(2 * np.pi * t + 0.5) + np.random.normal(0, 0.1, WINDOW_SIZE)
                                else:  # BAD
                                        ay = 5.0 * np.sin(2 * np.pi * t) + np.random.normal(0, 0.5, WINDOW_SIZE)
                                        gx = 4.0 * np.sin(2 * np.pi * t + 0.3) + np.random.normal(0, 0.5, WINDOW_SIZE)

                                ax = np.random.normal(0.5 * exercise_idx, 0.2, WINDOW_SIZE)
                                az = np.random.normal(-5.0, 0.3, WINDOW_SIZE)
                                gy = np.random.normal(0, 0.2, WINDOW_SIZE)
                                gz = np.random.normal(0, 0.2, WINDOW_SIZE)

                                window = np.stack([ax, ay, az, gx, gy, gz], axis=1)
                                reps.append(window)

                        all_X.append(np.array(reps))
                        all_y.extend([label_idx] * REPS_PER_CLASS)

        X = np.concatenate(all_X, axis=0).astype(np.float32)
        y = np.array(all_y, dtype=np.int32)
        print(f"  Dummy dataset: X={X.shape}, y={y.shape}")
        print(f"  Label distribution: {
                {LABELS[i]: int(np.sum(y == i)) for i in range(N_CLASSES)}
        }")
        return X, y


# ── Model ───────────────────────────────────────────────────────────────────

def build_model():
        inputs = keras.Input(shape=(WINDOW_SIZE, N_CHANNELS))

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

        # Collapse time → feature vector
        x = layers.GlobalAveragePooling1D()(x)

        # Classifier head
        x = layers.Dense(64, activation="relu")(x)
        x = layers.Dropout(0.3)(x)
        outputs = layers.Dense(N_CLASSES, activation="softmax")(x)

        return keras.Model(inputs, outputs)


# ── Main ────────────────────────────────────────────────────────────────────

def main():
        parser = argparse.ArgumentParser(description="Train WonkaLift form classifier")
        parser.add_argument(
                "--real",
                action="store_true",
                help="Use real CSVs from ml/data/ instead of dummy data",
        )
        args = parser.parse_args()

        # 1. Load data
        print("\n[1/5] Loading data...")
        if args.real:
                X, y = load_real_data()
        else:
                X, y = generate_dummy_data()

        # 2. Preprocess
        print("\n[2/5] Preprocessing...")
        X_mean = X.mean(axis=(0, 1), keepdims=True)
        X_std = X.std(axis=(0, 1), keepdims=True) + 1e-8

        X_norm = (X - X_mean) / X_std
        y_onehot = keras.utils.to_categorical(y, num_classes=N_CLASSES)

        print(f"  X_norm: {X_norm.shape}, range [{X_norm.min():.2f}, {X_norm.max():.2f}]")
        print(f"  X_mean: {X_mean.squeeze()}")
        print(f"  X_std:  {X_std.squeeze()}")

        # 3. Split
        X_train, X_test, y_train, y_test = train_test_split(
                X_norm, y_onehot, test_size=0.2, random_state=42, stratify=y
        )
        print(f"  Train: {X_train.shape} | Test: {X_test.shape}")

        # 4. Build + train
        print("\n[3/5] Building model...")
        model = build_model()
        model.summary()

        model.compile(
                optimizer=keras.optimizers.Adam(learning_rate=1e-3),
                loss="categorical_crossentropy",
                metrics=["accuracy"],
        )

        print("\n[4/5] Training...")
        early_stop = keras.callbacks.EarlyStopping(
                monitor="val_loss",
                patience=10,
                restore_best_weights=True,
                verbose=1,
        )

        model.fit(
                X_train,
                y_train,
                validation_data=(X_test, y_test),
                epochs=EPOCHS,
                batch_size=BATCH_SIZE,
                callbacks=[early_stop],
                verbose=1,
        )

        # Evaluate
        y_pred = np.argmax(model.predict(X_test), axis=1)
        y_true = np.argmax(y_test, axis=1)
        print("\nClassification Report:")
        print(classification_report(y_true, y_pred, target_names=LABELS))

        # 5. Export
        print("\n[5/5] Exporting TFLite + normalization stats...")

        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]
        tflite_model = converter.convert()

        tflite_path = os.path.join(SCRIPT_DIR, "wonkalift_classifier.tflite")
        mean_path = os.path.join(SCRIPT_DIR, "X_mean.npy")
        std_path = os.path.join(SCRIPT_DIR, "X_std.npy")

        with open(tflite_path, "wb") as f:
                f.write(tflite_model)
        np.save(mean_path, X_mean)
        np.save(std_path, X_std)

        print(f"  {tflite_path}  ({len(tflite_model)/1024:.1f} KB)")
        print(f"  {mean_path}")
        print(f"  {std_path}")
        print("\nDone.")


if __name__ == "__main__":
        main()
