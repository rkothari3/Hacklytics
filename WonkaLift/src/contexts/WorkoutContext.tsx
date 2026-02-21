import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { ExerciseType } from '../constants/exercises';
import { scoreRep, TempoScore } from '../utils/tempoScoring';
import { useBLE } from './BLEContext';

export interface RepRecord {
  index: number;
  timestamp: number;
  intervalMs: number;
  tempoScore: TempoScore;
}

export interface SessionResult {
  reps: RepRecord[];
  totalReps: number;
  onPaceCount: number;
  tooFastCount: number;
  tooSlowCount: number;
  qualityPct: number;
}

interface WorkoutState {
  isActive: boolean;
  exercise: ExerciseType | null;
  reps: RepRecord[];
}

type WorkoutAction =
  | { type: 'START_SESSION'; exercise: ExerciseType }
  | { type: 'ADD_REP'; rep: RepRecord }
  | { type: 'END_SESSION' };

function reducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case 'START_SESSION':
      return { isActive: true, exercise: action.exercise, reps: [] };
    case 'ADD_REP':
      return { ...state, reps: [...state.reps, action.rep] };
    case 'END_SESSION':
      return { ...state, isActive: false };
  }
}

interface WorkoutContextValue {
  isActive: boolean;
  exercise: ExerciseType | null;
  reps: RepRecord[];
  startSession: (exercise: ExerciseType) => void;
  endSession: () => SessionResult;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { repEventCount, lastRepTimestamp } = useBLE();
  const [state, dispatch] = useReducer(reducer, { isActive: false, exercise: null, reps: [] });

  // Wire BLE rep events into workout state
  useEffect(() => {
    if (!state.isActive || !state.exercise || lastRepTimestamp === null) return;

    const prevTimestamp = state.reps.at(-1)?.timestamp ?? null;
    const intervalMs = prevTimestamp !== null ? lastRepTimestamp - prevTimestamp : 0;
    const tempoScore = intervalMs > 0 ? scoreRep(intervalMs, state.exercise) : 'on-pace';

    dispatch({
      type: 'ADD_REP',
      rep: {
        index: state.reps.length + 1,
        timestamp: lastRepTimestamp,
        intervalMs,
        tempoScore,
      },
    });
    // repEventCount is intentionally in the dep array to trigger on each new rep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repEventCount]);

  const startSession = useCallback((exercise: ExerciseType) => {
    dispatch({ type: 'START_SESSION', exercise });
  }, []);

  const endSession = useCallback((): SessionResult => {
    dispatch({ type: 'END_SESSION' });
    const reps = state.reps;
    const totalReps = reps.length;
    const onPaceCount = reps.filter((r) => r.tempoScore === 'on-pace').length;
    const tooFastCount = reps.filter((r) => r.tempoScore === 'too-fast').length;
    const tooSlowCount = reps.filter((r) => r.tempoScore === 'too-slow').length;
    const qualityPct = totalReps > 0 ? Math.round((onPaceCount / totalReps) * 100) : 0;
    return { reps, totalReps, onPaceCount, tooFastCount, tooSlowCount, qualityPct };
  }, [state.reps]);

  return (
    <WorkoutContext.Provider value={{ isActive: state.isActive, exercise: state.exercise, reps: state.reps, startSession, endSession }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used inside WorkoutProvider');
  return ctx;
}
