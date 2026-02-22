import { ExerciseType, TUT_TARGETS } from '../constants/exercises';
import type { TempoScore } from '../types';

export function scoreRep(intervalMs: number, exercise: ExerciseType): TempoScore {
  const { minMs, maxMs } = TUT_TARGETS[exercise];
  if (intervalMs < minMs) return 'too-fast';
  if (intervalMs > maxMs) return 'too-slow';
  return 'on-pace';
}

export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  return weightKg / (1.0278 - 0.0278 * reps);
}
