import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { WONKA } from '../constants/wonka';
import type { LeaderboardEntry } from '../types';

type Props = { entries: LeaderboardEntry[] };

function LeaderboardStrip({ entries }: Props) {
  if (!entries || entries.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>SESSION LEADERBOARD</Text>
        <Text style={styles.empty}>No data yet</Text>
      </View>
    );
  }

  const sorted = [...entries].sort((a, b) => b.goldenTickets - a.goldenTickets).slice(0, 5);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>SESSION LEADERBOARD</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {sorted.map((entry, i) => (
            <View key={entry.name} style={[styles.entry, entry.isCurrentUser && styles.entryHighlight]}>
              <Text style={styles.rank}>{i + 1}.</Text>
              <Text style={[styles.name, entry.isCurrentUser && styles.nameHighlight]}>
                {entry.isCurrentUser ? 'YOU' : entry.name}
              </Text>
              <Text style={styles.tickets}>x{entry.goldenTickets}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default React.memo(LeaderboardStrip);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#150800',
    borderTopWidth: 1,
    borderTopColor: WONKA.goldDark,
  },
  label: { color: WONKA.textGold, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  entryHighlight: { backgroundColor: WONKA.goldDark + '33', borderRadius: 6, paddingHorizontal: 4 },
  rank: { color: WONKA.textLight, fontSize: 12, fontWeight: '700', marginRight: 3 },
  name: { color: WONKA.textLight, fontSize: 12, fontWeight: '600', marginRight: 3 },
  nameHighlight: { color: WONKA.gold, fontWeight: '900' },
  tickets: { color: WONKA.gold, fontSize: 12 },
  empty: { color: WONKA.textLight, fontSize: 11, opacity: 0.5 },
});
