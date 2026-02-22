import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { ExerciseType } from '../constants/exercises';
import { GOLDEN_TICKET_THRESHOLD } from '../constants/wonka';
import type { FormClass, LeaderboardEntry, RepRecord, SessionResult, TempoScore } from '../types';
import { classifyForm, loadFormModel } from '../utils/formClassifier';
import { scoreRep } from '../utils/tempoScoring';
import { speakCoaching } from '../utils/voiceCoach';
import { useBLE } from './BLEContext';

interface WorkoutState {
  isActive: boolean;
  exercise: ExerciseType | null;
  reps: RepRecord[];
  leaderboard: LeaderboardEntry[];
}

type WorkoutAction =
  | { type: 'START_SESSION'; exercise: ExerciseType }
  | { type: 'ADD_REP'; rep: RepRecord }
  | { type: 'END_SESSION' }
  | { type: 'UPDATE_LEADERBOARD'; entry: LeaderboardEntry };

function reducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case 'START_SESSION':
      return { ...state, isActive: true, exercise: action.exercise, reps: [] };
    case 'ADD_REP':
      return { ...state, reps: [...state.reps, action.rep] };
    case 'END_SESSION':
      return { ...state, isActive: false };
    case 'UPDATE_LEADERBOARD': {
      const existing = state.leaderboard.findIndex((e) => e.name === action.entry.name);
      if (existing >= 0) {
        const updated = [...state.leaderboard];
        updated[existing] = action.entry;
        return { ...state, leaderboard: updated };
      }
      return { ...state, leaderboard: [...state.leaderboard, action.entry] };
    }
  }
}

const INITIAL_STATE: WorkoutState = {
  isActive: false,
  exercise: null,
  reps: [],
  leaderboard: [
    { name: 'Charlie', goldenTickets: 3, isCurrentUser: false },
    { name: 'Augustus', goldenTickets: 1, isCurrentUser: false },
    { name: 'Violet', goldenTickets: 2, isCurrentUser: false },
    { name: 'YOU', goldenTickets: 0, isCurrentUser: true },
  ],
};

interface WorkoutContextValue {
  isActive: boolean;
  exercise: ExerciseType | null;
  reps: RepRecord[];
  leaderboard: LeaderboardEntry[];
  startSession: (exercise: ExerciseType) => void;
  endSession: () => SessionResult;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { repEventCount, lastRepTimestamp, lastRepWindow } = useBLE();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const modelLoaded = useRef(false);

  useEffect(() => {
    if (!modelLoaded.current) {
      loadFormModel().then(() => {
        modelLoaded.current = true;
      });
    }
  }, []);

  useEffect(() => {
    if (!state.isActive || !state.exercise || lastRepTimestamp === null) return;

    const prevTimestamp = state.reps.at(-1)?.timestamp ?? null;
    const intervalMs = prevTimestamp !== null ? lastRepTimestamp - prevTimestamp : 0;
    const tempoScore: TempoScore = intervalMs > 0 ? scoreRep(intervalMs, state.exercise) : 'on-pace';

    let formClass: FormClass = 'GOOD';
    if (lastRepWindow && lastRepWindow.length === 300 && state.exercise) {
      formClass = classifyForm(lastRepWindow, state.exercise);
    }

    const tempoWarning = formClass === 'GOOD' && tempoScore !== 'on-pace';

    const rep: RepRecord = {
      index: state.reps.length + 1,
      timestamp: lastRepTimestamp,
      intervalMs,
      tempoScore,
      formClass,
      tempoWarning,
    };

    dispatch({ type: 'ADD_REP', rep });
    speakCoaching(formClass, tempoWarning);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repEventCount]);

  const startSession = useCallback((exercise: ExerciseType) => {
    dispatch({ type: 'START_SESSION', exercise });
  }, []);

  const endSession = useCallback((): SessionResult => {
    dispatch({ type: 'END_SESSION' });

    const { reps, exercise } = state;
    const totalReps = reps.length;
    const goodCount = reps.filter((r) => r.formClass === 'GOOD').length;
    const badCount = reps.filter((r) => r.formClass === 'BAD').length;
    const tempoWarningCount = reps.filter((r) => r.tempoWarning).length;
    const onPaceCount = reps.filter((r) => r.tempoScore === 'on-pace').length;
    const tooFastCount = reps.filter((r) => r.tempoScore === 'too-fast').length;
    const tooSlowCount = reps.filter((r) => r.tempoScore === 'too-slow').length;
    const qualityPct = totalReps > 0 ? Math.round((goodCount / totalReps) * 100) : 0;
    const goldenTicket = qualityPct / 100 >= GOLDEN_TICKET_THRESHOLD && totalReps >= 5;

    if (goldenTicket) {
      const me = state.leaderboard.find((e) => e.isCurrentUser);
      if (me) {
        dispatch({
          type: 'UPDATE_LEADERBOARD',
          entry: { ...me, goldenTickets: me.goldenTickets + 1 },
        });
      }
    }

    return {
      exercise: exercise!,
      reps,
      totalReps,
      goodCount,
      badCount,
      tempoWarningCount,
      onPaceCount,
      tooFastCount,
      tooSlowCount,
      qualityPct,
      goldenTicket,
    };
  }, [state]);

  return (
    <WorkoutContext.Provider
      value={{
        isActive: state.isActive,
        exercise: state.exercise,
        reps: state.reps,
        leaderboard: state.leaderboard,
        startSession,
        endSession,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used inside WorkoutProvider');
  return ctx;
}
