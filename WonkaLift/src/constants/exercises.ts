export type ExerciseType = 'bicep_curl' | 'lateral_raise';

export const EXERCISES: { id: ExerciseType; label: string }[] = [
  { id: 'bicep_curl', label: 'Bicep Curl' },
  { id: 'lateral_raise', label: 'Lateral Raise' },
];

export const TUT_TARGETS: Record<ExerciseType, { minMs: number; maxMs: number }> = {
  bicep_curl: { minMs: 2000, maxMs: 4000 },
  lateral_raise: { minMs: 2500, maxMs: 4500 },
};
