import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BLEProvider } from '../src/contexts/BLEContext';
import { WorkoutProvider } from '../src/contexts/WorkoutContext';

export default function RootLayout() {
  return (
    <BLEProvider>
      <WorkoutProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </WorkoutProvider>
    </BLEProvider>
  );
}
