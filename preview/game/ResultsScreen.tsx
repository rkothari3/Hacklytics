// game/ResultsScreen.tsx
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, StatusBar, Image,
} from 'react-native';
import { COLORS } from './constants';
import { SessionSummary, RepResult } from './types';

type Props = {
  summary: SessionSummary;
  repFeed: RepResult[];
  onClose: () => void;
};

function RepBar({ rep }: { rep: RepResult }) {
  const color =
    rep.formClass === 'GOOD' ? COLORS.green :
    rep.formClass === 'SLOPPY' ? COLORS.gold :
    COLORS.candyRed;
  const height =
    rep.formClass === 'GOOD' ? 28 :
    rep.formClass === 'SLOPPY' ? 18 :
    10;
  return (
    <View style={[styles.repBar, { backgroundColor: color, height }]} />
  );
}

export default function ResultsScreen({ summary, repFeed, onClose }: Props) {
  const { totalReps, goodCount, sloppyCount, badCount, percentGood, goldenTicket, exercise } = summary;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: goldenTicket ? COLORS.gold : '#3A0000' }]}>
          {goldenTicket ? (
            <Image
              source={require('./assets/golden_ticket.png')}
              style={styles.bannerImage}
              resizeMode="contain"
            />
          ) : (
            <Image
              source={require('./assets/factory_rejected.jpg')}
              style={styles.bannerImage}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.bannerSub, { color: goldenTicket ? COLORS.chocolateMid : '#FF6666' }]}>
            {goldenTicket
              ? `${Math.round(percentGood * 100)}% good reps — Wonka is impressed!`
              : `${Math.round(percentGood * 100)}% good reps — need 80% to earn the ticket.`}
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{totalReps}</Text>
            <Text style={styles.statLabel}>TOTAL REPS</Text>
          </View>
          <View style={[styles.statBox, { borderColor: COLORS.green }]}>
            <Text style={[styles.statNum, { color: COLORS.green }]}>{goodCount}</Text>
            <Text style={styles.statLabel}>GOOD</Text>
          </View>
          <View style={[styles.statBox, { borderColor: COLORS.gold }]}>
            <Text style={[styles.statNum, { color: COLORS.gold }]}>{sloppyCount}</Text>
            <Text style={styles.statLabel}>SLOPPY</Text>
          </View>
          <View style={[styles.statBox, { borderColor: COLORS.candyRed }]}>
            <Text style={[styles.statNum, { color: COLORS.candyRed }]}>{badCount}</Text>
            <Text style={styles.statLabel}>BAD</Text>
          </View>
        </View>

        {/* Rep quality chart */}
        <Text style={styles.chartTitle}>REP QUALITY OVER TIME</Text>
        <View style={styles.chartContainer}>
          {repFeed.map((rep, i) => (
            <RepBar key={i} rep={rep} />
          ))}
        </View>
        <View style={styles.chartLegend}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
          <Text style={styles.legendText}>Good</Text>
          <View style={[styles.legendDot, { backgroundColor: COLORS.gold }]} />
          <Text style={styles.legendText}>Sloppy</Text>
          <View style={[styles.legendDot, { backgroundColor: COLORS.candyRed }]} />
          <Text style={styles.legendText}>Bad</Text>
        </View>

        {/* Exercise label */}
        <Text style={styles.exerciseLabel}>
          Exercise: {exercise.replace('_', ' ')}
        </Text>

        {/* Try again */}
        <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.buttonText}>TRY AGAIN</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 40 },
  banner: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerImage: {
    width: 260,
    height: 120,
    marginBottom: 8,
  },
  bannerSub: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#2A1000',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.goldDark,
  },
  statNum: {
    color: COLORS.textLight,
    fontSize: 26,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.textGold,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  chartTitle: {
    color: COLORS.textGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
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
  repBar: {
    width: 6,
    borderRadius: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.textLight,
    fontSize: 11,
    marginRight: 8,
  },
  exerciseLabel: {
    color: COLORS.textLight,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.6,
    textTransform: 'capitalize',
  },
  button: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: COLORS.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.textLight,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
