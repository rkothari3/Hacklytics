import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BLEProvider } from '../src/contexts/BLEContext';
import { WorkoutProvider } from '../src/contexts/WorkoutContext';
import { AppDataProvider } from '../src/contexts/AppDataContext';

export default function RootLayout() {
  return (
    <BLEProvider>
      <WorkoutProvider>
        <AppDataProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#1A0A00' },
            }}
          />
          <StatusBar style="light" />
        </AppDataProvider>
      </WorkoutProvider>
    </BLEProvider>
  );
}
