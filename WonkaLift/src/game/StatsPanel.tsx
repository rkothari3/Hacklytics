import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WONKA } from '../constants/wonka';
import type { TempoScore } from '../types';

interface Props {
  goodCount: number;
  badCount: number;
  tempoWarningCount: number;
  percentGood: number;
  lastTempo: TempoScore | null;
}

const TEMPO_LABELS: Record<TempoScore, string> = {
  'on-pace': 'ON PACE',
  'too-fast': 'TOO FAST',
  'too-slow': 'TOO SLOW',
};

const TEMPO_COLORS: Record<TempoScore, string> = {
  'on-pace': WONKA.green,
  'too-fast': WONKA.orange,
  'too-slow': WONKA.candyRed,
};

function CircularGauge({ percent }: { percent: number }) {
  const color = percent >= 80 ? WONKA.green : percent >= 50 ? WONKA.gold : WONKA.candyRed;
  return (
    <View style={[styles.gaugeOuter, { borderColor: color }]}>
      <Text style={[styles.gaugeText, { color }]}>{Math.round(percent)}%</Text>
    </View>
  );
}

export default function StatsPanel({ goodCount, badCount, tempoWarningCount, percentGood, lastTempo }: Props) {
  const totalReps = goodCount + badCount;

  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>FORM QUALITY</Text>
        <CircularGauge percent={percentGood} />
        <Text style={styles.repCount}>REPS: {totalReps}</Text>
        <View style={styles.subRow}>
          <Text style={[styles.subStat, { color: WONKA.green }]}>G:{goodCount}</Text>
          <Text style={[styles.subStat, { color: WONKA.candyRed }]}>B:{badCount}</Text>
          {tempoWarningCount > 0 && (
            <Text style={[styles.subStat, { color: WONKA.gold }]}>T:{tempoWarningCount}</Text>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>TEMPO</Text>
        {lastTempo ? (
          <>
            <View style={[styles.tempoChip, { backgroundColor: TEMPO_COLORS[lastTempo] + '33' }]}>
              <Text style={[styles.tempoText, { color: TEMPO_COLORS[lastTempo] }]}>
                {TEMPO_LABELS[lastTempo]}
              </Text>
            </View>
            <Text style={styles.tempoHint}>
              {lastTempo === 'on-pace' ? 'Great rhythm!' : lastTempo === 'too-fast' ? 'Slow it down' : 'Speed up a bit'}
            </Text>
          </>
        ) : (
          <Text style={styles.tempoWaiting}>Waiting...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, gap: 10 },
  card: {
    flex: 1,
    backgroundColor: '#2A1000',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WONKA.goldDark,
  },
  cardTitle: {
    color: WONKA.textGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  gaugeOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  gaugeText: { fontSize: 16, fontWeight: '900' },
  repCount: { color: WONKA.textLight, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  subRow: { flexDirection: 'row', gap: 8 },
  subStat: { fontSize: 12, fontWeight: '700' },
  tempoChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginVertical: 8,
  },
  tempoText: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  tempoHint: { color: WONKA.textLight, fontSize: 11, opacity: 0.7 },
  tempoWaiting: { color: WONKA.textLight, fontSize: 14, opacity: 0.4, marginTop: 12 },
});
