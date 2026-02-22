import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EXERCISES, ExerciseType } from '../src/constants/exercises';
import { WONKA } from '../src/constants/wonka';
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
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={WONKA.bg} />
      <View style={styles.container}>
        <Text style={styles.title}>Select Exercise</Text>
        <Text style={styles.subtitle}>Choose your challenge for this set.</Text>

        {EXERCISES.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            style={[styles.option, selected === ex.id && styles.optionSelected]}
            onPress={() => setSelected(ex.id)}
            activeOpacity={0.8}
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
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>START SET</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WONKA.bg },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: WONKA.gold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: WONKA.textLight,
    opacity: 0.5,
    marginBottom: 36,
  },
  option: {
    width: '100%',
    padding: 20,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: WONKA.goldDark + '55',
    backgroundColor: '#2A1000',
    marginBottom: 14,
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: WONKA.gold,
    backgroundColor: WONKA.purple,
  },
  optionText: { fontSize: 20, color: WONKA.textLight, fontWeight: '700' },
  optionTextSelected: { color: WONKA.gold },
  button: {
    backgroundColor: WONKA.orange,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    marginTop: 24,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#444' },
  buttonText: { color: WONKA.textLight, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
});
