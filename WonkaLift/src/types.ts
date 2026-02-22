import type { ExerciseType } from './constants/exercises';

export type FormClass = 'GOOD' | 'BAD';
export type TempoScore = 'on-pace' | 'too-fast' | 'too-slow';

/** Visual reaction for the boat: wobble = good form but off tempo */
export type BoatReaction = 'steady' | 'wobble' | 'slam';

export interface RepRecord {
  index: number;
  timestamp: number;
  intervalMs: number;
  tempoScore: TempoScore;
  formClass: FormClass;
  tempoWarning: boolean;
}

export interface SessionResult {
  exercise: ExerciseType;
  reps: RepRecord[];
  totalReps: number;
  goodCount: number;
  badCount: number;
  tempoWarningCount: number;
  onPaceCount: number;
  tooFastCount: number;
  tooSlowCount: number;
  qualityPct: number;
  goldenTicket: boolean;
}

export interface LeaderboardEntry {
  name: string;
  goldenTickets: number;
  isCurrentUser: boolean;
}
