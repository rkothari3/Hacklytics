import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useBLE } from '../src/contexts/BLEContext';

export default function HomeScreen() {
  const { connectionState, error, startScan } = useBLE();
  const router = useRouter();

  const stateLabel: Record<typeof connectionState, string> = {
    disconnected: 'Disconnected',
    scanning: 'Scanning…',
    connecting: 'Connecting…',
    connected: 'Connected',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WonkaLift</Text>

      <Text style={styles.status}>{stateLabel[connectionState]}</Text>
      {connectionState === 'scanning' || connectionState === 'connecting' ? (
        <ActivityIndicator style={styles.spinner} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {connectionState === 'disconnected' || connectionState === 'scanning' ? (
        <TouchableOpacity
          style={[styles.button, connectionState === 'scanning' && styles.buttonDisabled]}
          onPress={startScan}
          disabled={connectionState === 'scanning'}
        >
          <Text style={styles.buttonText}>Connect to Wristband</Text>
        </TouchableOpacity>
      ) : null}

      {connectionState === 'connected' ? (
        <TouchableOpacity style={styles.button} onPress={() => router.push('/exercise-select')}>
          <Text style={styles.buttonText}>Select Exercise</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 32 },
  status: { fontSize: 18, color: '#555', marginBottom: 12 },
  spinner: { marginBottom: 12 },
  error: { color: '#c00', marginBottom: 12, textAlign: 'center' },
  button: { backgroundColor: '#1a1a1a', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 8, marginTop: 16 },
  buttonDisabled: { backgroundColor: '#888' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
