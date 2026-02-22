#!/usr/bin/env python3
"""
WonkaLift — Local 1D CNN Form Classifier Training
==================================================
Standalone script (no Databricks needed).
Trains a 3-class form quality classifier (GOOD / SLOPPY / BAD)
and exports:
    ml/wonkalift_classifier.tflite

Hybrid input: (50, 12) per sample.
  - Channels 0-5:  per-sample z-normalized IMU signal (temporal shape)
  - Channels 6-11: per-channel range (max-min), broadcast across all
                    timesteps (encodes range of motion / ROM)

This lets the model learn BOTH temporal rep shape AND absolute ROM,
which is critical for distinguishing SLOPPY (same shape, reduced ROM)
from GOOD (same shape, full ROM).

Usage:
    python ml/train_local.py              # train on dummy data
    python ml/train_local.py --real       # train on real CSVs in ml/data/
"""

import argparse
import json
import os
import sys

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# ── Config ──────────────────────────────────────────────────────────────────
LABELS = ["GOOD", "BAD"]
ALL_CSV_LABELS = ["GOOD", "SLOPPY", "BAD"]  # SLOPPY merged into BAD at load time
EXERCISES = ["CURL", "LATERAL_RAISE"]
WINDOW_SIZE = 50
N_RAW_CHANNELS = 6
N_MODEL_CHANNELS = 12   # 6 normalized + 6 range
N_CLASSES = 2
REPS_PER_CLASS = 50

EPOCHS = 80
BATCH_SIZE = 32
AUGMENT_FACTOR = 8
LABEL_SMOOTHING = 0.1

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")

# Scale factor to bring range values into a similar magnitude as z-scores.
# Computed from the dataset: rough max per-channel range across all classes.
RANGE_SCALE = np.array([15.0, 15.0, 20.0, 6.0, 8.0, 8.0], dtype=np.float32)


# ── Feature engineering ─────────────────────────────────────────────────────

def build_hybrid_input(X_raw):
        """
        Convert raw (N, 50, 6) into hybrid (N, 50, 12).
        Channels 0-5:  per-sample z-normalized signal
        Channels 6-11: per-channel range / RANGE_SCALE, broadcast to all timesteps
        """
        N = X_raw.shape[0]

        # Per-sample z-normalization
        mean = X_raw.mean(axis=1, keepdims=True)
        std = X_raw.std(axis=1, keepdims=True) + 1e-8
        norm = (X_raw - mean) / std

        # Per-channel range, scaled to ~[0, 1]
        ch_range = X_raw.max(axis=1) - X_raw.min(axis=1)     # (N, 6)
        ch_range = ch_range / RANGE_SCALE                     # (N, 6)
        ch_range_bc = np.broadcast_to(
                ch_range[:, np.newaxis, :], (N, WINDOW_SIZE, N_RAW_CHANNELS)
        ).copy()

        return np.concatenate([norm, ch_range_bc], axis=2).astype(np.float32)


# ── Data augmentation ───────────────────────────────────────────────────────

def augment_batch(X, y, factor=AUGMENT_FACTOR):
        """
        Augment raw (N, 50, 6) samples before feature engineering.
        Applied on raw data so magnitude perturbations naturally affect
        the range channels after build_hybrid_input.
        """
        rng = np.random.default_rng(seed=42)
        aug_X, aug_y = [X.copy()], [y.copy()]

        for _ in range(factor - 1):
                batch = X.copy()

                noise_std = rng.uniform(0.05, 0.25)
                batch += rng.normal(0, noise_std, batch.shape).astype(np.float32)

                scales = rng.uniform(0.7, 1.3, size=(len(batch), 1, N_RAW_CHANNELS)).astype(np.float32)
                batch *= scales

                for i in range(len(batch)):
                        shift = rng.integers(-5, 6)
                        batch[i] = np.roll(batch[i], shift, axis=0)

                if rng.random() < 0.15:
                        drop_ch = rng.integers(0, N_RAW_CHANNELS)
                        batch[:, :, drop_ch] = 0.0

                aug_X.append(batch)
                aug_y.append(y.copy())

        return np.concatenate(aug_X, axis=0), np.concatenate(aug_y, axis=0)


# ── Data loading ────────────────────────────────────────────────────────────

def load_real_data():
        import pandas as pd

        # Map: GOOD -> 0, SLOPPY -> 1 (BAD), BAD -> 1 (BAD)
        CSV_TO_LABEL = {"GOOD": 0, "SLOPPY": 1, "BAD": 1}

        all_X, all_y = [], []
        for exercise in EXERCISES:
                for csv_label in ALL_CSV_LABELS:
                        filename = f"{csv_label}_{exercise}.csv"
                        filepath = os.path.join(DATA_DIR, filename)
                        if not os.path.exists(filepath):
                                sys.exit(f"ERROR: Missing data file: {filepath}")

                        df = pd.read_csv(filepath, header=None)
                        mapped_label = CSV_TO_LABEL[csv_label]
                        print(f"  Loaded {filepath}: {df.shape} -> {LABELS[mapped_label]}")

                        values = df.iloc[:, 1:].values.astype(np.float32)
                        X = values.reshape(-1, WINDOW_SIZE, N_RAW_CHANNELS)
                        all_X.append(X)
                        all_y.extend([mapped_label] * len(X))

        X = np.concatenate(all_X, axis=0)
        y = np.array(all_y, dtype=np.int32)
        print(f"  Total: X={X.shape}, y={y.shape}")
        print(f"  Distribution: {dict(zip(LABELS, [int(np.sum(y == i)) for i in range(N_CLASSES)]))}")
        return X, y


def generate_dummy_data():
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
                                else:
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
        return X, y


# ── Model ───────────────────────────────────────────────────────────────────

def build_model():
        inputs = keras.Input(shape=(WINDOW_SIZE, N_MODEL_CHANNELS))

        x = layers.Conv1D(32, kernel_size=5, padding="same", activation="relu")(inputs)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling1D(pool_size=2)(x)

        x = layers.Conv1D(64, kernel_size=3, padding="same", activation="relu")(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling1D(pool_size=2)(x)

        x = layers.Conv1D(64, kernel_size=3, padding="same", activation="relu")(x)
        x = layers.BatchNormalization()(x)

        x = layers.GlobalAveragePooling1D()(x)

        x = layers.Dense(64, activation="relu")(x)
        x = layers.Dropout(0.4)(x)
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
                X_raw, y = load_real_data()
        else:
                X_raw, y = generate_dummy_data()

        # 2. Augment on raw data, then build hybrid features
        print("\n[2/5] Augmenting + building hybrid features...")
        X_aug, y_aug = augment_batch(X_raw, y, factor=AUGMENT_FACTOR)
        print(f"  Augmented: {X_raw.shape[0]} -> {X_aug.shape[0]} samples ({AUGMENT_FACTOR}x)")

        X_hybrid = build_hybrid_input(X_aug)
        y_onehot = keras.utils.to_categorical(y_aug, num_classes=N_CLASSES)

        print(f"  Hybrid input: {X_hybrid.shape} (6 norm + 6 range channels)")
        print(f"  Range [{X_hybrid.min():.2f}, {X_hybrid.max():.2f}]")

        # 3. Split (stratified)
        X_train, X_test, y_train, y_test = train_test_split(
                X_hybrid, y_onehot, test_size=0.2, random_state=42, stratify=y_aug
        )
        print(f"  Train: {X_train.shape} | Test: {X_test.shape}")

        # 4. Build + train
        print("\n[3/5] Building model...")
        model = build_model()
        model.summary()

        model.compile(
                optimizer=keras.optimizers.Adam(learning_rate=1e-3),
                loss=keras.losses.CategoricalCrossentropy(label_smoothing=LABEL_SMOOTHING),
                metrics=["accuracy"],
        )

        print("\n[4/5] Training...")
        callbacks = [
                keras.callbacks.EarlyStopping(
                        monitor="val_loss", patience=12,
                        restore_best_weights=True, verbose=1,
                ),
                keras.callbacks.ReduceLROnPlateau(
                        monitor="val_loss", factor=0.5,
                        patience=5, min_lr=1e-5, verbose=1,
                ),
        ]

        model.fit(
                X_train, y_train,
                validation_data=(X_test, y_test),
                epochs=EPOCHS,
                batch_size=BATCH_SIZE,
                callbacks=callbacks,
                verbose=1,
        )

        # Evaluate
        y_pred = np.argmax(model.predict(X_test), axis=1)
        y_true = np.argmax(y_test, axis=1)
        print("\nClassification Report:")
        print(classification_report(y_true, y_pred, target_names=LABELS))

        # 5. Export
        print("\n[5/5] Exporting TFLite + range_scale.json...")

        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]
        tflite_model = converter.convert()

        tflite_path = os.path.join(SCRIPT_DIR, "wonkalift_classifier.tflite")
        with open(tflite_path, "wb") as f:
                f.write(tflite_model)

        range_scale_path = os.path.join(SCRIPT_DIR, "range_scale.json")
        with open(range_scale_path, "w") as f:
                json.dump({"range_scale": RANGE_SCALE.tolist()}, f, indent=2)

        print(f"  {tflite_path}  ({len(tflite_model)/1024:.1f} KB)")
        print(f"  {range_scale_path}")
        print(f"\n  Model input: (1, 50, 12)")
        print(f"    Ch 0-5:  per-sample z-normalized signal")
        print(f"    Ch 6-11: per-channel range / range_scale\n")
        print("Done.")


if __name__ == "__main__":
        main()
