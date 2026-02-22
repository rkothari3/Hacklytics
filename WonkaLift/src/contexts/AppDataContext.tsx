import React, { createContext, useContext, useState } from 'react';
import type { ExerciseType } from '../constants/exercises';

export interface WorkoutHistoryEntry {
  id: string;
  date: number;
  exercise: ExerciseType;
  totalReps: number;
  qualityPct: number;
  goldenTicket: boolean;
}

export interface FriendProfile {
  name: string;
  color: string;
  workoutDates: number[];
  oneRmProjection: { week: number; oneRM: number }[];
}

// Backward-compat alias
export type FriendProjection = FriendProfile;

interface UserProfile {
  name: string;
  followers: number;
  following: number;
}

interface AppDataContextType {
  profile: UserProfile;
  workoutHistory: WorkoutHistoryEntry[];
  friendProfiles: FriendProfile[];
  saveWorkout: (entry: Omit<WorkoutHistoryEntry, 'id'>) => void;
}

function anchor(daysBack: number, hour = 9): number {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(hour, 30, 0, 0);
  return d.getTime();
}

// Rayan's pre-seeded workout history — believable data spread over last 7 days
const MOCK_WORKOUT_HISTORY: WorkoutHistoryEntry[] = [
  { id: 'mw-1', date: anchor(0, 8),  exercise: 'bicep_curl',   totalReps: 12, qualityPct: 87, goldenTicket: true },
  { id: 'mw-2', date: anchor(0, 10), exercise: 'lateral_raise', totalReps: 10, qualityPct: 82, goldenTicket: true },
  { id: 'mw-3', date: anchor(1, 9),  exercise: 'bicep_curl',   totalReps: 8,  qualityPct: 75, goldenTicket: false },
  { id: 'mw-4', date: anchor(2, 7),  exercise: 'lateral_raise', totalReps: 12, qualityPct: 91, goldenTicket: true },
  { id: 'mw-5', date: anchor(4, 9),  exercise: 'bicep_curl',   totalReps: 10, qualityPct: 68, goldenTicket: false },
  { id: 'mw-6', date: anchor(5, 18), exercise: 'lateral_raise', totalReps: 9,  qualityPct: 84, goldenTicket: true },
  { id: 'mw-7', date: anchor(6, 7),  exercise: 'bicep_curl',   totalReps: 11, qualityPct: 79, goldenTicket: false },
];

const USER_PROFILE: UserProfile = { name: 'Rayan Das', followers: 12, following: 8 };

const FRIEND_PROFILES: FriendProfile[] = [
  {
    name: 'Charlie',
    color: '#5BC8F5',
    workoutDates: [
      anchor(0, 7), anchor(0, 15),
      anchor(1, 8),
      anchor(2, 9),
      anchor(4, 7), anchor(4, 16),
      anchor(5, 8),
      anchor(6, 9),
    ],
    oneRmProjection: [
      { week: 0, oneRM: 28 }, { week: 1, oneRM: 30 }, { week: 2, oneRM: 31 },
      { week: 3, oneRM: 33 }, { week: 4, oneRM: 35 }, { week: 5, oneRM: 37 },
      { week: 6, oneRM: 39 }, { week: 7, oneRM: 41 },
    ],
  },
  {
    name: 'Augustus',
    color: '#FF6B6B',
    workoutDates: [
      anchor(0, 10),
      anchor(2, 11),
      anchor(3, 9),
      anchor(6, 8),
    ],
    oneRmProjection: [
      { week: 0, oneRM: 36 }, { week: 1, oneRM: 37 }, { week: 2, oneRM: 37 },
      { week: 3, oneRM: 38 }, { week: 4, oneRM: 38 }, { week: 5, oneRM: 39 },
      { week: 6, oneRM: 39 }, { week: 7, oneRM: 40 },
    ],
  },
  {
    name: 'Violet',
    color: '#A78BFA',
    workoutDates: [
      anchor(0, 6),
      anchor(1, 7),
      anchor(2, 8),
      anchor(3, 6),
      anchor(4, 7),
      anchor(5, 6),
      anchor(6, 8),
    ],
    oneRmProjection: [
      { week: 0, oneRM: 22 }, { week: 1, oneRM: 24 }, { week: 2, oneRM: 27 },
      { week: 3, oneRM: 30 }, { week: 4, oneRM: 33 }, { week: 5, oneRM: 36 },
      { week: 6, oneRM: 39 }, { week: 7, oneRM: 43 },
    ],
  },
];

const AppDataContext = createContext<AppDataContextType | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryEntry[]>(MOCK_WORKOUT_HISTORY);

  function saveWorkout(entry: Omit<WorkoutHistoryEntry, 'id'>) {
    setWorkoutHistory(prev => [{ ...entry, id: `w-${Date.now()}` }, ...prev]);
  }

  return (
    <AppDataContext.Provider value={{ profile: USER_PROFILE, workoutHistory, friendProfiles: FRIEND_PROFILES, saveWorkout }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextType {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
