// preview/SimulatorScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import WonkaGameScreen from './game/WonkaGameScreen';
import { RepResult, LeaderboardEntry, SessionSummary, Exercise } from './game/types';

const FAKE_LEADERBOARD: LeaderboardEntry[] = [
  { name: 'YOU',    goldenTickets: 2, isCurrentUser: true },
  { name: 'Wonka',  goldenTickets: 5, isCurrentUser: false },
  { name: 'Bucket', goldenTickets: 3, isCurrentUser: false },
  { name: 'Oompa',  goldenTickets: 1, isCurrentUser: false },
];

// Weighted random: 60% GOOD, 25% SLOPPY, 15% BAD
function randomRep(repNumber: number): RepResult {
  const r = Math.random();
  const formClass = r < 0.6 ? 'GOOD' : r < 0.85 ? 'SLOPPY' : 'BAD';
  const t = Math.random();
  const tempoScore = t < 0.55 ? 'PERFECT' : t < 0.8 ? 'FAST' : 'SLOW';
  return { formClass, tempoScore, repNumber };
}

export default function SimulatorScreen() {
  const [exercise, setExercise] = useState<Exercise>('BICEP_CURL');
  const [repFeed, setRepFeed] = useState<RepResult[]>([]);
  const [running, setRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const repRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        repRef.current += 1;
        setRepFeed(prev => [...prev, randomRep(repRef.current)]);
      }, 1800);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  function handleStart() {
    setRepFeed([]);
    repRef.current = 0;
    setSummary(null);
    setShowResults(false);
    setRunning(true);
  }

  function handleStop() {
    setRunning(false);
  }

  function handleSessionEnd(s: SessionSummary) {
    setRunning(false);
    setSummary(s);
  }

  // Exercise picker — shown before starting
  if (!running && repFeed.length === 0) {
    return (
      <View style={styles.picker}>
        <Text style={styles.pickerTitle}>WonkaLift Preview</Text>
        <Text style={styles.pickerSub}>Pick an exercise to simulate</Text>

        {(['BICEP_CURL', 'LATERAL_RAISE'] as Exercise[]).map(ex => (
          <TouchableOpacity
            key={ex}
            style={[styles.exButton, exercise === ex && styles.exButtonActive]}
            onPress={() => setExercise(ex)}
          >
            <Text style={[styles.exText, exercise === ex && styles.exTextActive]}>
              {ex.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startText}>START SIMULATION</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <WonkaGameScreen
        exercise={exercise}
        repFeed={repFeed}
        leaderboard={FAKE_LEADERBOARD}
        onSessionEnd={handleSessionEnd}
      />
      {/* Floating controls — stop sim or reset */}
      <View style={styles.controls}>
        {running ? (
          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.stopText}>⏸ PAUSE REPS</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={() => {
            setRepFeed([]);
            repRef.current = 0;
            setSummary(null);
            setShowResults(false);
          }}>
            <Text style={styles.stopText}>↩ RESET</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  picker: {
    flex: 1,
    backgroundColor: '#1A0A00',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  pickerTitle: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 1,
  },
  pickerSub: {
    color: '#FFF8E1',
    fontSize: 14,
    marginBottom: 32,
    opacity: 0.7,
  },
  exButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C8A800',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#2A1000',
  },
  exButtonActive: {
    backgroundColor: '#C8A800',
  },
  exText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exTextActive: {
    color: '#1A0A00',
  },
  startButton: {
    marginTop: 24,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
  },
  startText: {
    color: '#FFF8E1',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  controls: {
    position: 'absolute',
    top: 60,
    right: 12,
    zIndex: 999,
  },
  stopButton: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  stopText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
});
