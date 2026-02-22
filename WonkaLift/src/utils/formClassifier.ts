import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import { WINDOW_SIZE, N_CHANNELS } from '../constants/ble';
import type { ExerciseType } from '../constants/exercises';
import type { FormClass } from '../types';

const LABELS: FormClass[] = ['GOOD', 'BAD'];
const N_MODEL_CH = 12; // 6 normalized + 6 range

// Must match RANGE_SCALE in train_local.py
const RANGE_SCALE = [15.0, 15.0, 20.0, 6.0, 8.0, 8.0];

// Minimum confidence required to return GOOD — biases toward corrective feedback
const GOOD_CONFIDENCE_FLOOR = 0.68;

// Minimum ay range required for a rep window to be considered a full-ROM rep.
// ay is channel index 1 (indices 1, 7, 13, ... in the flat window).
// Values derived from training data: GOOD min ranges are 6.5 (curl) and 5.1 (lateral).
// Gates are set 1.5 units below those minimums as a safe margin.
const ROM_MIN_AY_RANGE: Record<ExerciseType, number> = {
  bicep_curl: 5.0,
  lateral_raise: 3.5,
};

let model: TensorflowModel | null = null;

export async function loadFormModel(): Promise<void> {
  if (model) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    model = await loadTensorflowModel(require('../../assets/ml/wonkalift_classifier.tflite'));
    console.log('[ML] Model loaded. Inputs:', JSON.stringify(model.inputs), 'Outputs:', JSON.stringify(model.outputs));
  } catch (e) {
    console.error('[ML] Failed to load model:', e);
  }
}

/**
 * Build hybrid (50, 12) input from raw (50, 6) IMU data.
 * Channels 0-5:  per-sample z-normalized signal (temporal shape)
 * Channels 6-11: per-channel range / RANGE_SCALE (ROM magnitude)
 */
function buildHybridInput(raw: number[]): Float32Array {
  const out = new Float32Array(WINDOW_SIZE * N_MODEL_CH);

  const mean = new Float64Array(N_CHANNELS);
  const std = new Float64Array(N_CHANNELS);
  const chMin = new Float64Array(N_CHANNELS).fill(Infinity);
  const chMax = new Float64Array(N_CHANNELS).fill(-Infinity);

  for (let t = 0; t < WINDOW_SIZE; t++) {
    for (let c = 0; c < N_CHANNELS; c++) {
      const v = raw[t * N_CHANNELS + c];
      mean[c] += v;
      if (v < chMin[c]) chMin[c] = v;
      if (v > chMax[c]) chMax[c] = v;
    }
  }
  for (let c = 0; c < N_CHANNELS; c++) mean[c] /= WINDOW_SIZE;

  for (let t = 0; t < WINDOW_SIZE; t++) {
    for (let c = 0; c < N_CHANNELS; c++) {
      const diff = raw[t * N_CHANNELS + c] - mean[c];
      std[c] += diff * diff;
    }
  }
  for (let c = 0; c < N_CHANNELS; c++) std[c] = Math.sqrt(std[c] / WINDOW_SIZE) + 1e-8;

  const scaledRange = new Float64Array(N_CHANNELS);
  for (let c = 0; c < N_CHANNELS; c++) {
    scaledRange[c] = (chMax[c] - chMin[c]) / RANGE_SCALE[c];
  }

  for (let t = 0; t < WINDOW_SIZE; t++) {
    const outBase = t * N_MODEL_CH;
    const rawBase = t * N_CHANNELS;
    for (let c = 0; c < N_CHANNELS; c++) {
      out[outBase + c] = (raw[rawBase + c] - mean[c]) / std[c];
      out[outBase + N_CHANNELS + c] = scaledRange[c];
    }
  }
  return out;
}

/**
 * Compute the ay channel range across the window.
 * ay is channel 1, so flat indices are 1, 7, 13, ... (t * N_CHANNELS + 1).
 */
function ayRange(rawWindow: number[]): number {
  let min = Infinity;
  let max = -Infinity;
  for (let t = 0; t < WINDOW_SIZE; t++) {
    const v = rawWindow[t * N_CHANNELS + 1];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}

/**
 * Classify a raw IMU rep window into GOOD / BAD.
 * rawWindow: 300 floats ordered [ax0,ay0,az0,gx0,gy0,gz0, ax1,ay1,...].
 * exercise: used to select per-exercise ROM gate threshold.
 *
 * Two pre-model gates run before ML inference:
 *   1. ROM gate — if the ay range is below the exercise minimum, return BAD immediately.
 *   2. After inference, confidence floor — only trust GOOD if P(GOOD) >= 0.68.
 */
export function classifyForm(rawWindow: number[], exercise: ExerciseType): FormClass {
  if (!model || rawWindow.length !== WINDOW_SIZE * N_CHANNELS) return 'GOOD';

  // ROM gate: reject reps with insufficient range of motion before running ML
  const range = ayRange(rawWindow);
  const minRange = ROM_MIN_AY_RANGE[exercise];
  if (range < minRange) {
    console.log(`[ML] ROM gate triggered — ay range ${range.toFixed(2)} < ${minRange} → BAD`);
    return 'BAD';
  }

  try {
    const hybrid = buildHybridInput(rawWindow);

    const output = model.runSync([hybrid]);

    if (!output || output.length === 0 || !output[0] || output[0].length < 2) {
      console.warn('[ML] Unexpected output:', output?.length, output?.[0]?.length);
      return 'GOOD';
    }

    const probs = output[0];
    // Confidence floor: only label GOOD if the model is sufficiently certain
    const pGood = probs[0];
    const result: FormClass = pGood >= GOOD_CONFIDENCE_FLOOR ? 'GOOD' : 'BAD';

    console.log(`[ML] ay_range=${range.toFixed(1)} P(GOOD)=${pGood.toFixed(3)} -> ${result}`);
    return result;
  } catch (e) {
    console.error('[ML] Inference error:', e);
    return 'GOOD';
  }
}
