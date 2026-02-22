// game/StatsPanel.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from './constants';
import { RepResult, TempoScore } from './types';

type Props = {
  repFeed: RepResult[];
  goodCount: number;
  totalReps: number;
  lastRep: RepResult | null;
};

function tempoLabel(score: TempoScore): string {
  if (score === 'PERFECT') return 'PERFECT';
  if (score === 'FAST') return 'TOO FAST';
  return 'TOO SLOW';
}

function tempoColor(score: TempoScore): string {
  if (score === 'PERFECT') return COLORS.green;
  if (score === 'FAST') return COLORS.candyRed;
  return COLORS.gold;
}

function CircularGauge({ percent }: { percent: number }) {
  const color =
    percent >= 0.8 ? COLORS.green :
    percent >= 0.5 ? COLORS.gold :
    COLORS.candyRed;
  return (
    <View style={[styles.gaugeOuter, { borderColor: color }]}>
      <Text style={[styles.gaugeText, { color }]}>
        {Math.round(percent * 100)}%
      </Text>
    </View>
  );
}

function computeScore(repFeed: RepResult[]): number {
  return repFeed.reduce((acc, r) => {
    const formPts = r.formClass === 'GOOD' ? 10 : r.formClass === 'SLOPPY' ? 4 : 0;
    const tempoPts = r.tempoScore === 'PERFECT' ? 5 : 0;
    return acc + formPts + tempoPts;
  }, 0);
}

export default function StatsPanel({ repFeed, goodCount, totalReps, lastRep }: Props) {
  const percentGood = totalReps > 0 ? goodCount / totalReps : 0;
  const score = computeScore(repFeed);
  const currentTempo = lastRep?.tempoScore ?? null;

  return (
    <View style={styles.row}>
      {/* Left card: Rep Quality */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>REP QUALITY</Text>
        <CircularGauge percent={percentGood} />
        <Text style={styles.repCount}>REPS: {totalReps}</Text>
        <Text style={styles.subStat}>
          ✅ {goodCount}{'  '}⚠️ {repFeed.filter(r => r.formClass === 'SLOPPY').length}{'  '}❌ {repFeed.filter(r => r.formClass === 'BAD').length}
        </Text>
      </View>

      {/* Right card: Tempo + Score */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>TEMPO</Text>
        <Text style={[
          styles.tempoValue,
          { color: currentTempo ? tempoColor(currentTempo) : COLORS.textLight },
        ]}>
          {currentTempo ? tempoLabel(currentTempo) : '—'}
        </Text>
        <Text style={styles.scoreLabel}>SCORE</Text>
        <Text style={styles.scoreValue}>{score}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#2A1000',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.goldDark,
  },
  cardTitle: {
    color: COLORS.textGold,
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
  gaugeText: {
    fontSize: 16,
    fontWeight: '900',
  },
  repCount: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  subStat: {
    color: COLORS.textLight,
    fontSize: 11,
  },
  tempoValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
    marginBottom: 12,
  },
  scoreLabel: {
    color: COLORS.textGold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  scoreValue: {
    color: COLORS.gold,
    fontSize: 28,
    fontWeight: '900',
  },
});
