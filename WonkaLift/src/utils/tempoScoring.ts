import { ExerciseType, TUT_TARGETS } from '../constants/exercises';

export type TempoScore = 'on-pace' | 'too-fast' | 'too-slow';

export function scoreRep(intervalMs: number, exercise: ExerciseType): TempoScore {
  const { minMs, maxMs } = TUT_TARGETS[exercise];
  if (intervalMs < minMs) return 'too-fast';
  if (intervalMs > maxMs) return 'too-slow';
  return 'on-pace';
}

// Brzycki 1RM formula
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  return weightKg / (1.0278 - 0.0278 * reps);
}
