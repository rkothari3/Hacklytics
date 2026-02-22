import type { ExerciseType } from '../constants/exercises';
import type { FormClass } from '../types';

export async function loadFormModel(): Promise<void> {}

export function classifyForm(_rawWindow: number[], _exercise: ExerciseType): FormClass {
  return Math.random() < 0.7 ? 'GOOD' : 'BAD';
}
