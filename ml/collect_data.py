#!/usr/bin/env python3
"""
WonkaLift — Serial Data Collector
==================================
Reads rep windows from data_collect.cpp over USB serial and saves them
to ml/data/{LABEL}_{EXERCISE}.csv, ready for train_local.py --real.

Usage:
    python ml/collect_data.py                     # auto-detect port

Requirements:
    pip install pyserial
"""

import argparse
import glob
import os
import sys
import time

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    sys.exit("ERROR: pyserial not installed. Run: pip install pyserial")

# ── Config ───────────────────────────────────────────────────────────────────
BAUD_RATE   = 115200
TARGET_REPS = 50
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_DIR    = os.path.join(SCRIPT_DIR, "data")

LABELS    = ["GOOD", "SLOPPY", "BAD"]
EXERCISES = ["CURL", "LATERAL_RAISE"]

# ── Helpers ──────────────────────────────────────────────────────────────────

def find_port():
    """Auto-detect the first likely ESP32 serial port."""
    ports = list(serial.tools.list_ports.comports())
    if not ports:
        return None
    # Prefer ports with ESP32-like descriptions
    for p in ports:
        desc = (p.description or "").lower()
        if any(k in desc for k in ["cp210", "ch340", "ftdi", "uart", "usb serial"]):
            return p.device
    # Fall back to first available port
    return ports[0].device


def count_existing(label, exercise):
    """Count reps already saved for this label+exercise combo."""
    path = os.path.join(DATA_DIR, f"{label}_{exercise}.csv")
    if not os.path.exists(path):
        return 0
    with open(path) as f:
        return sum(1 for line in f if line.strip() and not line.startswith("#"))


def progress_summary():
    """Print a table of current collection progress."""
    print("\n  Current progress:")
    print(f"  {'':20s}", end="")
    for ex in EXERCISES:
        print(f"  {ex:>15s}", end="")
    print()
    for label in LABELS:
        print(f"  {label:<20s}", end="")
        for ex in EXERCISES:
            n = count_existing(label, ex)
            bar = "#" * n + "-" * max(0, TARGET_REPS - n)
            bar = bar[:20]  # keep it short
            status = f"{n:>2}/{TARGET_REPS}"
            print(f"  {status:>15s}", end="")
        print()
    print()


def append_rep(label, exercise, line):
    """Append one CSV line to the correct file."""
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, f"{label}_{exercise}.csv")
    with open(path, "a") as f:
        f.write(line + "\n")


def validate_csv_line(line, label, exercise):
    """
    Check the line looks like a valid rep from data_collect.cpp.
    Expected format: LABEL_EXERCISE,<300 floats>
    Returns (ok: bool, error_msg: str)
    """
    parts = line.strip().split(",")
    expected_prefix = f"{label}_{exercise}"
    if parts[0] != expected_prefix:
        return False, f"prefix mismatch: got '{parts[0]}', expected '{expected_prefix}'"
    if len(parts) != 301:  # 1 label + 300 floats (50 timesteps × 6 channels)
        return False, f"expected 301 columns, got {len(parts)}"
    try:
        [float(v) for v in parts[1:]]
    except ValueError as e:
        return False, f"non-float value: {e}"
    return True, ""


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="WonkaLift serial data collector")
    parser.add_argument("--port", help="Serial port (e.g. COM3 or /dev/ttyUSB0)")
    args = parser.parse_args()

    # ── Choose port
    port = args.port
    if not port:
        port = find_port()
        if not port:
            sys.exit(
                "ERROR: No serial port found. Plug in the ESP32 or pass --port manually."
            )
        print(f"  Auto-detected port: {port}")

    print("\n" + "=" * 60)
    print("  WonkaLift Data Collector")
    print("=" * 60)
    progress_summary()

    # ── Choose exercise
    print("  Which exercise?")
    for i, ex in enumerate(EXERCISES):
        print(f"    [{i}] {ex}")
    while True:
        try:
            ex_idx = int(input("  > ").strip())
            if 0 <= ex_idx < len(EXERCISES):
                break
        except ValueError:
            pass
        print("  Enter 0 or 1.")
    exercise = EXERCISES[ex_idx]

    # ── Choose label
    print(f"\n  Which form class?")
    for i, lb in enumerate(LABELS):
        n = count_existing(lb, exercise)
        print(f"    [{i}] {lb}  ({n}/{TARGET_REPS} collected)")
    while True:
        try:
            lb_idx = int(input("  > ").strip())
            if 0 <= lb_idx < len(LABELS):
                break
        except ValueError:
            pass
        print("  Enter 0, 1, or 2.")
    label = LABELS[lb_idx]

    already = count_existing(label, exercise)
    remaining = TARGET_REPS - already
    if remaining <= 0:
        print(f"\n  {label} {exercise} already has {already} reps (target met).")
        print("  Delete ml/data/{label}_{exercise}.csv to re-collect.")
        sys.exit(0)

    print(f"\n  Collecting: {label} {exercise}")
    print(f"  Progress:   {already}/{TARGET_REPS} reps saved ({remaining} to go)")
    print(f"\n  Firmware must be flashed with:")
    print(f"    ACTIVE_CLASS    = CLASS_{label}")
    print(f"    ACTIVE_EXERCISE = EXERCISE_{exercise}")
    print(f"\n  Press Enter when ready to start recording...")
    input()

    # ── Open serial port
    try:
        ser = serial.Serial(port, BAUD_RATE, timeout=2)
    except serial.SerialException as e:
        sys.exit(f"ERROR: Could not open {port}: {e}")

    print(f"  Connected to {port} at {BAUD_RATE} baud.")
    print(f"  Waiting for reps... (Ctrl+C to stop)\n")

    # Flush any stale data
    time.sleep(1)
    ser.reset_input_buffer()

    session_count = 0
    session_skipped = 0

    try:
        while True:
            raw = ser.readline()
            if not raw:
                continue

            try:
                line = raw.decode("utf-8", errors="ignore").strip()
            except Exception:
                continue

            # Print firmware comments/status lines
            if line.startswith("#"):
                print(f"  [ESP32] {line[1:].strip()}")
                continue

            # Empty line
            if not line:
                continue

            # Validate
            ok, err = validate_csv_line(line, label, exercise)
            if not ok:
                print(f"  [SKIP] Bad line ({err}): {line[:60]}...")
                session_skipped += 1
                continue

            # Save
            append_rep(label, exercise, line)
            session_count += 1
            total = already + session_count
            bar_filled = min(20, int(20 * total / TARGET_REPS))
            bar = "#" * bar_filled + "-" * (20 - bar_filled)
            print(f"  REP {total:>3}/{TARGET_REPS}  [{bar}]  (+{session_count} this session)")

            if total >= TARGET_REPS:
                print(f"\n  Target reached! {TARGET_REPS} reps saved for {label} {exercise}.")
                break

    except KeyboardInterrupt:
        print(f"\n\n  Stopped by user.")

    finally:
        ser.close()

    # ── Summary
    print(f"\n  Session summary:")
    print(f"    Reps saved:    {session_count}")
    print(f"    Reps skipped:  {session_skipped}")
    print(f"    Total on disk: {already + session_count}/{TARGET_REPS}")
    print()
    progress_summary()

    all_done = all(
        count_existing(lb, ex) >= TARGET_REPS
        for lb in LABELS for ex in EXERCISES
    )
    if all_done:
        print("  ALL 6 classes complete! Run training with:")
        print("    python ml/train_local.py --real\n")
    else:
        print("  Run this script again to collect the next class.\n")


if __name__ == "__main__":
    main()
