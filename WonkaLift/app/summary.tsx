import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { IMG } from '../src/game/images';
import { WONKA } from '../src/constants/wonka';
import { getLastSessionResult } from './workout';
import type { RepRecord } from '../src/types';

function RepBar({ rep }: { rep: RepRecord }) {
  const color = rep.formClass === 'BAD' ? WONKA.candyRed : rep.tempoWarning ? WONKA.gold : WONKA.green;
  const height = rep.formClass === 'BAD' ? 10 : rep.tempoWarning ? 18 : 28;
  return <View style={[styles.repBar, { backgroundColor: color, height }]} />;
}

export default function SummaryScreen() {
  const result = getLastSessionResult();
  const router = useRouter();

  if (!result) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.noData}>No session data.</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={styles.link}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const {
    totalReps,
    goodCount,
    badCount,
    tempoWarningCount,
    onPaceCount,
    tooFastCount,
    tooSlowCount,
    qualityPct,
    goldenTicket,
    exercise,
    reps,
  } = result;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={WONKA.bg} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.banner, { backgroundColor: goldenTicket ? WONKA.gold : '#3A0000' }]}>
          <Image
            source={goldenTicket ? IMG.goldenTicket : IMG.factoryRejected}
            style={styles.bannerImage}
            resizeMode="contain"
          />
          <Text
            style={[styles.bannerSub, { color: goldenTicket ? WONKA.chocolateMid : '#FF6666' }]}
          >
            {goldenTicket
              ? `${qualityPct}% good form -- Wonka is impressed!`
              : `${qualityPct}% good form -- need 80% for the ticket.`}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>FORM QUALITY</Text>
        <View style={styles.statsGrid}>
          <StatBox label="TOTAL" value={totalReps} />
          <StatBox label="GOOD" value={goodCount} color={WONKA.green} />
          <StatBox label="BAD" value={badCount} color={WONKA.candyRed} />
          <StatBox label="TEMPO" value={tempoWarningCount} color={WONKA.gold} />
        </View>

        <Text style={styles.sectionTitle}>TEMPO</Text>
        <View style={styles.statsGrid}>
          <StatBox label="ON PACE" value={onPaceCount} color={WONKA.green} />
          <StatBox label="TOO FAST" value={tooFastCount} color={WONKA.orange} />
          <StatBox label="TOO SLOW" value={tooSlowCount} color={WONKA.candyRed} />
        </View>

        <Text style={styles.sectionTitle}>REP QUALITY OVER TIME</Text>
        <View style={styles.chartContainer}>
          {reps.map((rep, i) => (
            <RepBar key={i} rep={rep} />
          ))}
        </View>
        <View style={styles.chartLegend}>
          <View style={[styles.legendDot, { backgroundColor: WONKA.green }]} />
          <Text style={styles.legendText}>Good</Text>
          <View style={[styles.legendDot, { backgroundColor: WONKA.gold }]} />
          <Text style={styles.legendText}>Off Tempo</Text>
          <View style={[styles.legendDot, { backgroundColor: WONKA.candyRed }]} />
          <Text style={styles.legendText}>Bad</Text>
        </View>

        <Text style={styles.exerciseLabel}>
          {exercise.replace('_', ' ').toUpperCase()}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/exercise-select')}>
            <Text style={styles.buttonText}>NEW SET</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => router.replace('/')}
          >
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>DONE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={[styles.statBox, color ? { borderColor: color } : undefined]}>
      <Text style={[styles.statNum, color ? { color } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WONKA.bg },
  scroll: { paddingBottom: 40 },
  noData: { color: WONKA.textLight, textAlign: 'center', marginTop: 100, fontSize: 16 },
  link: { color: WONKA.gold, textAlign: 'center', marginTop: 16, textDecorationLine: 'underline' },
  banner: { padding: 24, alignItems: 'center', marginBottom: 20 },
  bannerImage: { width: 260, height: 120, marginBottom: 8 },
  bannerSub: { fontSize: 14, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  sectionTitle: {
    color: WONKA.textGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: '#2A1000',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: WONKA.goldDark,
  },
  statNum: { color: WONKA.textLight, fontSize: 26, fontWeight: '900' },
  statLabel: { color: WONKA.textGold, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginTop: 2 },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 36,
    marginHorizontal: 16,
    backgroundColor: '#2A1000',
    borderRadius: 8,
    padding: 4,
    gap: 2,
    overflow: 'hidden',
  },
  repBar: { width: 6, borderRadius: 2 },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
    gap: 6,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: WONKA.textLight, fontSize: 11, marginRight: 8 },
  exerciseLabel: {
    color: WONKA.textLight,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.6,
    letterSpacing: 2,
  },
  actions: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 24, paddingHorizontal: 16 },
  button: {
    flex: 1,
    backgroundColor: WONKA.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: WONKA.gold,
  },
  buttonText: { color: WONKA.textLight, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  buttonTextSecondary: { color: WONKA.gold },
});
