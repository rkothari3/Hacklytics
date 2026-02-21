import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RepRecord, SessionResult, useWorkout } from '../src/contexts/WorkoutContext';

// Stored outside component so summary screen can read it after endSession clears state
let lastSessionResult: SessionResult | null = null;
export function getLastSessionResult() { return lastSessionResult; }

const TEMPO_LABEL: Record<RepRecord['tempoScore'], string> = {
  'on-pace': 'On Pace ✓',
  'too-fast': 'Too Fast ⚠',
  'too-slow': 'Too Slow ⚠',
};

const TEMPO_COLOR: Record<RepRecord['tempoScore'], string> = {
  'on-pace': '#1a8a1a',
  'too-fast': '#cc7700',
  'too-slow': '#cc0000',
};

export default function WorkoutScreen() {
  const { reps, endSession, exercise } = useWorkout();
  const router = useRouter();

  const lastRep = reps.at(-1);
  const last5 = reps.slice(-5).reverse();

  function handleEndSet() {
    lastSessionResult = endSession();
    router.push('/summary');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.exercise}>{exercise?.replace('_', ' ').toUpperCase()}</Text>

      <Text style={styles.repCount}>{reps.length}</Text>
      <Text style={styles.repLabel}>reps</Text>

      {lastRep ? (
        <Text style={[styles.tempoLabel, { color: TEMPO_COLOR[lastRep.tempoScore] }]}>
          {TEMPO_LABEL[lastRep.tempoScore]}
        </Text>
      ) : (
        <Text style={styles.tempoPlaceholder}>Waiting for first rep…</Text>
      )}

      <FlatList
        style={styles.repList}
        data={last5}
        keyExtractor={(item) => String(item.index)}
        renderItem={({ item }) => (
          <View style={styles.repRow}>
            <Text style={styles.repRowText}>
              Rep {item.index} — {item.intervalMs > 0 ? `${(item.intervalMs / 1000).toFixed(1)}s` : '—'} —{' '}
              <Text style={{ color: TEMPO_COLOR[item.tempoScore] }}>{TEMPO_LABEL[item.tempoScore]}</Text>
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No reps yet</Text>}
      />

      <TouchableOpacity style={styles.button} onPress={handleEndSet}>
        <Text style={styles.buttonText}>End Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 80, padding: 24, backgroundColor: '#fff' },
  exercise: { fontSize: 14, color: '#888', letterSpacing: 2, marginBottom: 16 },
  repCount: { fontSize: 96, fontWeight: '800', lineHeight: 100 },
  repLabel: { fontSize: 20, color: '#888', marginBottom: 16 },
  tempoLabel: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  tempoPlaceholder: { fontSize: 18, color: '#aaa', marginBottom: 16 },
  repList: { width: '100%', flex: 1, marginTop: 8 },
  repRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  repRowText: { fontSize: 15, color: '#333' },
  emptyText: { color: '#bbb', textAlign: 'center', marginTop: 16 },
  button: { backgroundColor: '#c00', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 8, marginBottom: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
