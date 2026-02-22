import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WONKA } from '../../src/constants/wonka';
import { useAppData, WorkoutHistoryEntry } from '../../src/contexts/AppDataContext';
import { useBLE } from '../../src/contexts/BLEContext';
import { EXERCISES } from '../../src/constants/exercises';

const CARD_BG = '#221000';
const BORDER = 'rgba(255,215,0,0.2)';
const CREAM_DIM = 'rgba(255,248,225,0.48)';
const GOLD_GLOW = 'rgba(255,215,0,0.18)';

// Per-exercise accent colors for card left stripe
const EXERCISE_ACCENT: Record<string, string> = {
  bicep_curl: WONKA.orange,
  lateral_raise: '#8B44B0',
};

function exerciseAccent(id: string): string {
  return EXERCISE_ACCENT[id] ?? WONKA.gold;
}

function exerciseLabel(id: string) {
  return EXERCISES.find(e => e.id === id)?.label ?? id;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── BLE Status Chip ───────────────────────────────────────────────
function BLEStatus() {
  const { connectionState, startScan } = useBLE();
  const connected = connectionState === 'connected';
  const scanning = connectionState === 'scanning' || connectionState === 'connecting';
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (connected) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.2, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
    pulse.setValue(1);
  }, [connected]);

  return (
    <TouchableOpacity
      style={[styles.bleChip, connected ? styles.bleConnected : styles.bleOff]}
      onPress={connected ? undefined : startScan}
      disabled={scanning}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.bleDot,
          { backgroundColor: connected ? WONKA.green : '#555', opacity: connected ? pulse : 1 },
        ]}
      />
      <Text style={[styles.bleText, { color: connected ? WONKA.green : CREAM_DIM }]}>
        {connected ? 'Connected' : scanning ? 'Connecting…' : 'Connect Band'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Workout History Card ──────────────────────────────────────────
function WorkoutCard({ item }: { item: WorkoutHistoryEntry }) {
  const accent = exerciseAccent(item.exercise);
  const isGood = item.qualityPct >= 80;
  return (
    <View style={[styles.card, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardExercise}>{exerciseLabel(item.exercise)}</Text>
        <Text style={styles.cardMeta}>{formatDate(item.date)}  ·  {item.totalReps} reps</Text>
      </View>
      <View style={styles.cardRight}>
        <View style={[
          styles.qualityPill,
          {
            backgroundColor: isGood ? 'rgba(46,204,64,0.12)' : 'rgba(255,107,0,0.12)',
            borderColor: isGood ? 'rgba(46,204,64,0.3)' : 'rgba(255,107,0,0.3)',
          },
        ]}>
          <Text style={[styles.qualityText, { color: isGood ? WONKA.green : WONKA.orange }]}>
            {item.qualityPct}%
          </Text>
        </View>
        <Text style={styles.cardBadge}>{item.goldenTicket ? '🎫' : '❌'}</Text>
      </View>
    </View>
  );
}

// ─── Workout Tab ───────────────────────────────────────────────────
export default function WorkoutTab() {
  const router = useRouter();
  const { workoutHistory } = useAppData();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={WONKA.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appEyebrow}>WRIST TRAINER</Text>
            <Text style={styles.appTitle}>WonkaLift</Text>
          </View>
          <BLEStatus />
        </View>

        {/* ── CTA Button ── */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push('/exercise-select')}
          activeOpacity={0.82}
        >
          <View style={styles.startBtnInner}>
            <View style={styles.startBtnPlusWrap}>
              <Text style={styles.startBtnPlus}>+</Text>
            </View>
            <Text style={styles.startBtnText}>Start Workout</Text>
          </View>
        </TouchableOpacity>

        {/* ── History ── */}
        {workoutHistory.length > 0 ? (
          <>
            <View style={styles.sectionRow}>
              <View style={styles.sectionAccentBar} />
              <View>
                <Text style={styles.sectionLabel}>Recent Sets</Text>
                <Text style={styles.sectionCount}>{workoutHistory.length} sessions logged</Text>
              </View>
            </View>
            {workoutHistory.map(item => (
              <WorkoutCard key={item.id} item={item} />
            ))}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏋</Text>
            <Text style={styles.emptyText}>No workouts yet</Text>
            <Text style={styles.emptySubtext}>Tap Start Workout above to begin</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WONKA.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 44 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 28,
  },
  appEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: CREAM_DIM,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: WONKA.gold,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(255,215,0,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },

  // BLE chip
  bleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
  },
  bleConnected: {
    borderColor: 'rgba(46,204,64,0.4)',
    backgroundColor: 'rgba(46,204,64,0.08)',
    shadowColor: WONKA.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  bleOff: { borderColor: BORDER, backgroundColor: GOLD_GLOW },
  bleDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  bleText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },

  // Start button
  startBtn: {
    backgroundColor: WONKA.gold,
    borderRadius: 18,
    paddingVertical: 20,
    marginBottom: 36,
    shadowColor: WONKA.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  startBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startBtnPlusWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(26,10,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnPlus: { fontSize: 20, fontWeight: '900', color: WONKA.bg, lineHeight: 22 },
  startBtnText: { fontSize: 17, fontWeight: '900', color: WONKA.bg, letterSpacing: 0.4 },

  // Section header row
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  sectionAccentBar: {
    width: 3,
    height: 36,
    backgroundColor: WONKA.gold,
    borderRadius: 2,
    marginTop: 2,
    shadowColor: WONKA.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF8E1',
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: CREAM_DIM,
  },

  // Workout card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  cardLeft: { flex: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardExercise: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF8E1',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  cardMeta: { fontSize: 12, color: CREAM_DIM, fontWeight: '600' },
  qualityPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  qualityText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  cardBadge: { fontSize: 20 },

  // Empty state
  empty: { alignItems: 'center', marginTop: 80, opacity: 0.6 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '800', color: '#FFF8E1', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: CREAM_DIM, fontWeight: '600' },
});
