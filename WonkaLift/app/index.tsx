import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { IMG } from '../src/game/images';
import { WONKA } from '../src/constants/wonka';
import { useBLE } from '../src/contexts/BLEContext';

export default function HomeScreen() {
  const { connectionState, error, startScan } = useBLE();
  const router = useRouter();

  const stateLabel: Record<typeof connectionState, string> = {
    disconnected: 'Disconnected',
    scanning: 'Scanning...',
    connecting: 'Connecting...',
    connected: 'Connected',
  };

  const isScanning = connectionState === 'scanning' || connectionState === 'connecting';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={WONKA.bg} />

      <View style={styles.container}>
        <Image source={IMG.goldenTicket} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>WonkaLift</Text>
        <Text style={styles.subtitle}>Train like you mean it.</Text>

        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, connectionState === 'connected' && styles.statusDotGreen]} />
          <Text style={styles.statusText}>{stateLabel[connectionState]}</Text>
        </View>

        {isScanning && <ActivityIndicator color={WONKA.gold} style={styles.spinner} />}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {connectionState === 'disconnected' && (
          <TouchableOpacity style={styles.button} onPress={startScan} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Connect Wristband</Text>
          </TouchableOpacity>
        )}

        {connectionState === 'scanning' && (
          <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
            <Text style={styles.buttonText}>Searching...</Text>
          </TouchableOpacity>
        )}

        {connectionState === 'connected' && (
          <TouchableOpacity
            style={[styles.button, styles.buttonGold]}
            onPress={() => router.push('/exercise-select')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonTextDark}>Start Workout</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WONKA.bg },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { width: 200, height: 80, marginBottom: 24 },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: WONKA.gold,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: WONKA.textLight,
    opacity: 0.6,
    marginBottom: 40,
  },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#555',
    marginRight: 8,
  },
  statusDotGreen: { backgroundColor: WONKA.green },
  statusText: { color: WONKA.textLight, fontSize: 16 },
  spinner: { marginBottom: 12 },
  error: { color: WONKA.candyRed, marginBottom: 12, textAlign: 'center', fontSize: 14 },
  button: {
    backgroundColor: WONKA.purple,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    marginTop: 16,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#444' },
  buttonGold: { backgroundColor: WONKA.gold },
  buttonText: { color: WONKA.textLight, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  buttonTextDark: { color: WONKA.bg, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
});
