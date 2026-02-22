// game/WonkaGameScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { COLORS, SCREEN_W, GOLDEN_TICKET_THRESHOLD } from './constants';
import { RepResult, LeaderboardEntry, SessionSummary, Exercise } from './types';
import RiverCanvas from './RiverCanvas';
import StatsPanel from './StatsPanel';
import DurabilityBar from './DurabilityBar';
import LeaderboardStrip from './LeaderboardStrip';
import ResultsScreen from './ResultsScreen';

type Props = {
  exercise: Exercise;
  repFeed: RepResult[];
  leaderboard: LeaderboardEntry[];
  onSessionEnd: (summary: SessionSummary) => void;
};

export default function WonkaGameScreen({ exercise, repFeed, leaderboard, onSessionEnd }: Props) {
  const [showResults, setShowResults] = useState(false);

  const lastRep = repFeed.length > 0 ? repFeed[repFeed.length - 1] : null;
  const goodCount = repFeed.filter(r => r.formClass === 'GOOD').length;
  const sloppyCount = repFeed.filter(r => r.formClass === 'SLOPPY').length;
  const badCount = repFeed.filter(r => r.formClass === 'BAD').length;
  const totalReps = repFeed.length;
  const percentGood = totalReps > 0 ? goodCount / totalReps : 0;

  const handleDone = useCallback(() => {
    const summary: SessionSummary = {
      totalReps,
      goodCount,
      sloppyCount,
      badCount,
      percentGood,
      goldenTicket: percentGood >= GOLDEN_TICKET_THRESHOLD,
      exercise,
    };
    onSessionEnd(summary);
    setShowResults(true);
  }, [totalReps, goodCount, sloppyCount, badCount, percentGood, exercise, onSessionEnd]);

  if (showResults) {
    return (
      <ResultsScreen
        summary={{
          totalReps, goodCount, sloppyCount, badCount,
          percentGood,
          goldenTicket: percentGood >= GOLDEN_TICKET_THRESHOLD,
          exercise,
        }}
        repFeed={repFeed}
        onClose={() => setShowResults(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Wonka River Challenge</Text>
        <View style={styles.headerRight}>
          <Text style={styles.goalText}>GOAL: 80%</Text>
          <Text style={styles.ticketIcon}>🎫</Text>
        </View>
      </View>

      {/* Durability bar */}
      <DurabilityBar badCount={badCount} />

      {/* River game canvas */}
      <RiverCanvas lastRep={lastRep} />

      {/* Stats cards */}
      <StatsPanel
        repFeed={repFeed}
        goodCount={goodCount}
        totalReps={totalReps}
        lastRep={lastRep}
      />

      {/* Done button */}
      <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
        <Text style={styles.doneText}>
          {percentGood >= GOLDEN_TICKET_THRESHOLD ? 'COLLECT GOLDEN TICKET!' : 'DONE'}
        </Text>
      </TouchableOpacity>

      {/* Leaderboard strip */}
      <LeaderboardStrip entries={leaderboard} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.purple,
  },
  title: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '700',
  },
  ticketIcon: {
    fontSize: 18,
  },
  doneButton: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: COLORS.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneText: {
    color: COLORS.textLight,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
