// game/types.ts

export type FormClass = 'GOOD' | 'SLOPPY' | 'BAD';
export type TempoScore = 'PERFECT' | 'FAST' | 'SLOW';
export type Exercise = 'BICEP_CURL' | 'LATERAL_RAISE';

export type RepResult = {
  formClass: FormClass;
  tempoScore: TempoScore;
  repNumber: number;
};

export type LeaderboardEntry = {
  name: string;
  goldenTickets: number;
  isCurrentUser: boolean;
};

export type SessionSummary = {
  totalReps: number;
  goodCount: number;
  sloppyCount: number;
  badCount: number;
  percentGood: number;
  goldenTicket: boolean;
  exercise: string;
};
