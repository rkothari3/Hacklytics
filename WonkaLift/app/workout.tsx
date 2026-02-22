import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SCREEN_W } from '../src/constants/wonka';
import DurabilityBar from '../src/game/DurabilityBar';
import { IMG } from '../src/game/images';
import LeaderboardStrip from '../src/game/LeaderboardStrip';
import RiverCanvas from '../src/game/RiverCanvas';
import StatsPanel from '../src/game/StatsPanel';
import { GOLDEN_TICKET_THRESHOLD, WONKA } from '../src/constants/wonka';
import { useWorkout } from '../src/contexts/WorkoutContext';
import type { BoatReaction, SessionResult } from '../src/types';

let lastSessionResult: SessionResult | null = null;
export function getLastSessionResult() {
  return lastSessionResult;
}

export default function WorkoutScreen() {
  const { reps, exercise, leaderboard, endSession } = useWorkout();
  const router = useRouter();
  const [ending, setEnding] = useState(false);

  const lastRep = reps.at(-1) ?? null;
  const lastTempo = lastRep?.tempoScore ?? null;

  const boatReaction: BoatReaction | null = useMemo(() => {
    if (!lastRep) return null;
    if (lastRep.formClass === 'BAD') return 'slam';
    if (lastRep.tempoWarning) return 'wobble';
    return 'steady';
  }, [lastRep]);

  const goodCount = useMemo(() => reps.filter((r) => r.formClass === 'GOOD').length, [reps]);
  const badCount = useMemo(() => reps.filter((r) => r.formClass === 'BAD').length, [reps]);
  const tempoWarningCount = useMemo(() => reps.filter((r) => r.tempoWarning).length, [reps]);
  const percentGood = useMemo(
    () => (reps.length === 0 ? 0 : Math.round((goodCount / reps.length) * 100)),
    [goodCount, reps.length],
  );

  const handleDone = useCallback(() => {
    if (ending) return;
    setEnding(true);
    lastSessionResult = endSession();
    router.push('/summary');
  }, [ending, endSession, router]);

  const aboveThreshold = percentGood / 100 >= GOLDEN_TICKET_THRESHOLD;

  const inner = (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={WONKA.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Wonka River Challenge</Text>
        <View style={styles.headerRight}>
          <Text style={styles.goalText}>GOAL: 80%</Text>
          <Image source={IMG.goldenTicket} style={styles.ticketIcon} />
        </View>
      </View>

      <DurabilityBar badCount={badCount} />

      <RiverCanvas boatReaction={boatReaction} />

      <StatsPanel
        goodCount={goodCount}
        badCount={badCount}
        tempoWarningCount={tempoWarningCount}
        percentGood={percentGood}
        lastTempo={lastTempo}
      />

      {lastRep && (
        <View style={styles.lastRepBanner}>
          <Text
            style={[
              styles.lastRepText,
              {
                color: lastRep.formClass === 'BAD'
                  ? WONKA.candyRed
                  : lastRep.tempoWarning
                    ? WONKA.gold
                    : WONKA.green,
              },
            ]}
          >
            REP {lastRep.index}: {lastRep.formClass}
            {lastRep.tempoWarning ? ` (${lastRep.tempoScore === 'too-fast' ? 'FAST' : 'SLOW'})` : ''}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.doneButton, aboveThreshold && styles.doneButtonGold]}
        onPress={handleDone}
        activeOpacity={0.8}
      >
        <Text style={styles.doneText}>
          {aboveThreshold ? 'COLLECT GOLDEN TICKET!' : 'END SET'}
        </Text>
      </TouchableOpacity>

      <LeaderboardStrip entries={leaderboard} />
    </SafeAreaView>
  );

  if (Platform.OS === 'web') {
    return <View style={styles.webWrapper}>{inner}</View>;
  }
  return inner;
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: WONKA.bg,
  },
  root: { flex: 1, backgroundColor: WONKA.bg, maxWidth: SCREEN_W, width: '100%' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: WONKA.purple,
  },
  title: { color: WONKA.gold, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  goalText: { color: WONKA.gold, fontSize: 14, fontWeight: '700' },
  ticketIcon: { width: 32, height: 15, resizeMode: 'contain', marginLeft: 6 },
  lastRepBanner: { alignItems: 'center', paddingVertical: 4, backgroundColor: WONKA.bg },
  lastRepText: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  doneButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: WONKA.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonGold: { backgroundColor: WONKA.gold },
  doneText: { color: WONKA.textLight, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
});
