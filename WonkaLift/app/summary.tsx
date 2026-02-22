import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { estimateOneRepMax } from '../src/utils/tempoScoring';
import { getLastSessionResult } from './workout';

export default function SessionSummaryScreen() {
  const result = getLastSessionResult();
  const router = useRouter();
  const [weightKg, setWeightKg] = useState('');

  if (!result) {
    return (
      <View style={styles.container}>
        <Text>No session data.</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={styles.link}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { totalReps, onPaceCount, tooFastCount, tooSlowCount, qualityPct } = result;
  const goldenTicket = qualityPct >= 80 && totalReps >= 5;

  const weight = parseFloat(weightKg);
  const oneRM = !isNaN(weight) && weight > 0 && totalReps > 0
    ? estimateOneRepMax(weight, totalReps)
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Complete</Text>

      {goldenTicket ? (
        <Text style={styles.goldenTicket}>GOLDEN TICKET EARNED</Text>
      ) : (
        <Text style={styles.noTicket}>Try again next set</Text>
      )}

      <View style={styles.statsBlock}>
        <StatRow label="Total Reps" value={String(totalReps)} />
        <StatRow label="On Pace" value={String(onPaceCount)} color="#1a8a1a" />
        <StatRow label="Too Fast" value={String(tooFastCount)} color="#cc7700" />
        <StatRow label="Too Slow" value={String(tooSlowCount)} color="#cc0000" />
        <StatRow label="Quality" value={`${qualityPct}%`} />
      </View>

      <View style={styles.oneRmRow}>
        <Text style={styles.oneRmLabel}>Weight (kg):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="e.g. 20"
        />
      </View>
      {oneRM !== null ? (
        <Text style={styles.oneRmResult}>Estimated 1RM: {oneRM.toFixed(1)} kg</Text>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/exercise-select')}>
          <Text style={styles.buttonText}>New Set</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => router.replace('/')}>
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 80, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  goldenTicket: { fontSize: 20, fontWeight: '700', color: '#b8860b', marginBottom: 24 },
  noTicket: { fontSize: 16, color: '#888', marginBottom: 24 },
  statsBlock: { width: '100%', borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 24 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  statLabel: { fontSize: 16, color: '#555' },
  statValue: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  oneRmRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  oneRmLabel: { fontSize: 16, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, width: 100, fontSize: 16 },
  oneRmResult: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: { backgroundColor: '#1a1a1a', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 8 },
  buttonSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a1a1a' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  buttonTextSecondary: { color: '#1a1a1a' },
  link: { color: '#1a1a1a', marginTop: 16, textDecorationLine: 'underline' },
});
