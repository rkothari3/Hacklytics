import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EXERCISES, ExerciseType } from '../src/constants/exercises';
import { useWorkout } from '../src/contexts/WorkoutContext';

export default function ExerciseSelectScreen() {
  const [selected, setSelected] = useState<ExerciseType | null>(null);
  const { startSession } = useWorkout();
  const router = useRouter();

  function handleStart() {
    if (!selected) return;
    startSession(selected);
    router.push('/workout');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Exercise</Text>

      {EXERCISES.map((ex) => (
        <TouchableOpacity
          key={ex.id}
          style={[styles.option, selected === ex.id && styles.optionSelected]}
          onPress={() => setSelected(ex.id)}
        >
          <Text style={[styles.optionText, selected === ex.id && styles.optionTextSelected]}>
            {ex.label}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.button, !selected && styles.buttonDisabled]}
        onPress={handleStart}
        disabled={!selected}
      >
        <Text style={styles.buttonText}>Start Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 32 },
  option: {
    width: '100%', padding: 18, borderRadius: 8, borderWidth: 2,
    borderColor: '#ddd', marginBottom: 12, alignItems: 'center',
  },
  optionSelected: { borderColor: '#1a1a1a', backgroundColor: '#1a1a1a' },
  optionText: { fontSize: 18, color: '#333', fontWeight: '500' },
  optionTextSelected: { color: '#fff' },
  button: { backgroundColor: '#1a1a1a', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 8, marginTop: 24 },
  buttonDisabled: { backgroundColor: '#888' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
