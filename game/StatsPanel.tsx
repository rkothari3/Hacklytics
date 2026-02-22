// game/StatsPanel.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from './constants';

interface StatsPanelProps {
  goodCount: number;
  sloppyCount: number;
  badCount: number;
  percentGood: number;
}

function CircularGauge({ percent }: { percent: number }) {
  const color =
    percent >= 80 ? COLORS.green :
    percent >= 50 ? COLORS.gold :
    COLORS.candyRed;
  return (
    <View style={[styles.gaugeOuter, { borderColor: color }]}>
      <Text style={[styles.gaugeText, { color }]}>
        {Math.round(percent)}%
      </Text>
    </View>
  );
}

export default function StatsPanel({ goodCount, sloppyCount, badCount, percentGood }: StatsPanelProps) {
  const totalReps = goodCount + sloppyCount + badCount;

  return (
    <View style={styles.row}>
      {/* Left card: Rep Quality */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>REP QUALITY</Text>
        <CircularGauge percent={percentGood} />
        <Text style={styles.repCount}>REPS: {totalReps}</Text>
        <Text style={styles.subStat}>
          ✅ {goodCount}{'  '}⚠️ {sloppyCount}{'  '}❌ {badCount}
        </Text>
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
});
