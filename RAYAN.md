React App Summary:
Init RN project, set up repo
BLE connection handler (react-native-ble-plx) — connects to "WonkaLift", receives rep count notifications
Exercise selector screen (manual entry — curl, lateral raise)
Game screen UI — the Wonka boat/chocolate river animation, rep counter display, tempo ring
Session summary screen — reps done, quality score, Golden Ticket if earned





WonkaLift React Native App — Functional MVP Plan
Context
The ESP32 hardware is done: BLE GATT server advertising as "WonkaLift", firing a uint8 rep count notification per detected rep. The React Native app is greenfield. This plan focuses on building a functionally correct app — BLE working, exercise selection, live rep counting with tempo, and a session summary — without worrying about the Wonka theme or animations yet.

Note: src/main.cpp loop is currently in debug mode (printing IMU axes only). The peak detection state machine needs to be re-enabled before testing the full BLE flow.

1. Project Initialization
BLE is fully blocked in Expo Go — it requires native Bluetooth code baked into the app binary. Use Expo Dev Build: build a custom app with the BLE native module included, then develop with hot reload exactly like Expo Go.

Requires Mac + Xcode installed (iPhone target). Phone must be plugged in for the first install.


npx create-expo-app WonkaLift
cd WonkaLift
npx expo install react-native-ble-plx @config-plugins/react-native-ble-plx \
  @react-navigation/native @react-navigation/native-stack \
  react-native-screens react-native-safe-area-context

app.json — add BLE plugin inside "plugins":

[
  "react-native-ble-plx",
  { "bluetoothAlwaysPermission": "Allow WonkaLift to connect to Bluetooth" }
]

This plugin injects the NSBluetoothAlwaysUsageDescription into Info.plist automatically — do not add it manually.

npx expo prebuild        # generates ios/ and android/ native projects
npx expo run:ios         # builds + installs on plugged-in iPhone (~5-10 min first run)

After the first install, save → hot reload works as normal. Only re-run expo prebuild if you add/remove native modules.
2. File Structure

WonkaLift/
├── App.tsx                       # Root: providers + NavigationContainer
├── src/
│   ├── navigation/
│   │   └── RootNavigator.tsx     # Stack: Home → ExerciseSelect → Workout → Summary
│   ├── contexts/
│   │   ├── BLEContext.tsx        # BLE manager, scan/connect/subscribe
│   │   └── WorkoutContext.tsx    # Session state: reps, timestamps, scores
│   ├── screens/
│   │   ├── HomeScreen.tsx        # BLE connect button + connection status
│   │   ├── ExerciseSelectScreen.tsx  # Pick exercise (3 options)
│   │   ├── WorkoutScreen.tsx     # Rep counter + tempo indicator (live)
│   │   └── SessionSummaryScreen.tsx  # Reps done, quality %, Golden Ticket
│   ├── constants/
│   │   ├── ble.ts                # UUIDs + device name
│   │   └── exercises.ts          # Exercise defs + TUT targets (ms)
│   └── utils/
│       └── tempoScoring.ts       # TUT scoring + Brzycki 1RM formula
3. Navigation Flow

HomeScreen → ExerciseSelectScreen → WorkoutScreen → SessionSummaryScreen
                     ↑                                        |
                     └────────────────────────────────────────┘
                                 ("New Set")
Stack navigator with default transitions.

App.tsx provider order:


<BLEContext.Provider>
  <WorkoutContext.Provider>
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  </WorkoutContext.Provider>
</BLEContext.Provider>
4. BLE Integration — BLEContext.tsx
src/constants/ble.ts:


export const WONKA_DEVICE_NAME = 'WonkaLift';
export const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
State shape:


{ manager, device, connectionState: 'disconnected'|'scanning'|'connecting'|'connected',
  lastRepTimestamp: number | null, repEventCount: number, error: string | null }
Connect flow:

manager.startDeviceScan() — filter by device.name === 'WonkaLift' in callback (UUID filter unreliable on iOS)
device.connect() → discoverAllServicesAndCharacteristics()
device.monitorCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID, cb)
Each notification = 1 rep. Record Date.now() as timestamp, increment repEventCount.
Parsing:


import { Buffer } from 'buffer';  // polyfill needed in RN
const repCount = Buffer.from(characteristic.value, 'base64').readUInt8(0);
// Use notification arrival (not the count value) as the rep event
5. WorkoutContext — WorkoutContext.tsx
Uses useReducer to batch state updates and avoid extra re-renders on the hot path.

Rep record:


interface RepRecord {
  index: number;
  timestamp: number;        // epoch ms
  intervalMs: number;       // time since previous rep
  tempoScore: 'on-pace' | 'too-fast' | 'too-slow';
}
Tempo targets (src/constants/exercises.ts):


export const TUT_TARGETS = {
  bicep_curl:    { minMs: 2000, maxMs: 4000 },
  lateral_raise: { minMs: 2500, maxMs: 4500 },
  dumbbell_row:  { minMs: 2500, maxMs: 5000 },
};
Scoring (src/utils/tempoScoring.ts):


export function scoreRep(intervalMs: number, exercise: ExerciseType): TempoScore {
  const { minMs, maxMs } = TUT_TARGETS[exercise];
  if (intervalMs < minMs) return 'too-fast';
  if (intervalMs > maxMs) return 'too-slow';
  return 'on-pace';
}
Context actions:

startSession(exercise) — resets reps array, sets exercise, marks isActive: true
processNewRep(timestamp) — computes interval, scores tempo, appends RepRecord
endSession() — returns SessionResult (reps, quality%, goodRepCount)
WorkoutContext subscribes to repEventCount + lastRepTimestamp from BLEContext internally so screens don't need to wire BLE manually.

6. Screens
HomeScreen
Text label showing connection state (Disconnected / Scanning… / Connected)
"Connect to Wristband" button → calls startScan()
On connect, auto-navigate to ExerciseSelectScreen (or show a "Go to exercise select" button)
ExerciseSelectScreen
Three touchable items: Bicep Curl | Lateral Raise | Dumbbell Row
Highlight selected item
"Start Set" button (disabled until selection) → calls startSession(exercise) → navigates to WorkoutScreen
WorkoutScreen
Large rep count number (updates live from WorkoutContext)
Current tempo label: "On Pace ✓" | "Too Fast ⚠" | "Too Slow ⚠"
Last 5 reps listed: rep# — intervalMs — tempoScore (simple FlatList)
"End Set" button → calls endSession() → navigates to SessionSummaryScreen
SessionSummaryScreen
Total reps
On-pace / too-fast / too-slow counts
Quality % (on-pace reps / total)
Golden Ticket: text "🎫 GOLDEN TICKET EARNED" if quality ≥ 80% and reps ≥ 5, else "Try again"
Estimated 1RM (Brzycki): requires user to input weight in kg (simple TextInput)
Formula: 1RM = weight / (1.0278 - 0.0278 × reps)
"New Set" → ExerciseSelectScreen | "Done" → HomeScreen
7. Key Gotchas
Expo Go is incompatible with BLE: always use npx expo run:ios (Expo Dev Build). Expo Go will silently fail or crash when BLE APIs are called.
Buffer polyfill: install buffer package and import explicitly for BLE value decoding
BLE scan iOS: filter by device name (not service UUID) — UUID filter is unreliable on iOS for some peripherals
app.json plugin config: @config-plugins/react-native-ble-plx must be listed in "plugins" before running expo prebuild, otherwise the native Bluetooth entitlements are missing and the app will crash on scan
Re-prebuild required: if you ever add or remove a native module, run npx expo prebuild again before npx expo run:ios
Firmware debug mode: src/main.cpp peak detection is currently commented out; needs re-enabling before end-to-end testing
Provider tree: BLEContext must wrap WorkoutContext (WorkoutContext consumes BLE events)
8. Build Order
Scaffold project, install deps, configure app.json BLE plugin, run expo prebuild + expo run:ios, verify app installs on device
BLEContext.tsx — scan/connect/subscribe, verify rep notifications in console log
Navigation skeleton — all 4 screens blank, transitions working
WorkoutContext.tsx — processNewRep wired to BLE events
HomeScreen — connect button + status label
ExerciseSelectScreen — 3 options, selection state, Start Set button
WorkoutScreen — live rep count, tempo label, rep list
SessionSummaryScreen — stats, Golden Ticket text, 1RM calc
Critical Files
/Users/rayandas/Documents/Hacklytics/src/main.cpp — confirms BLE UUIDs + uint8 payload; peak detection needs re-enabling
WonkaLift/src/contexts/BLEContext.tsx — everything depends on this working first
WonkaLift/src/contexts/WorkoutContext.tsx — core session logic
WonkaLift/src/screens/WorkoutScreen.tsx — the primary live-use screen
Verification
BLE: Connect app to ESP32, do a rep → repEventCount increments, timestamp recorded
WorkoutScreen: Rep counter increments live, tempo label updates correctly
Tempo: Do 5 fast reps (< 2s each for curl) → all flagged "Too Fast"
SessionSummary: 10 reps, 8 on-pace → quality = 80% → Golden Ticket shown
1RM calc: Enter 20kg, 10 reps → displays ~26.7 kg




Clarifications about BLE:
BLE is 100% blocked in Expo Go. Here's why and how to fix it in simple terms:
Why It's Blocked
Expo Go is basically a pre-built app on your phone that lets you test React Native code instantly without building anything. The problem is BLE requires native Bluetooth code baked into the actual app — Expo Go doesn't have that and can't add it on the fly.
The Fix — Expo Dev Build
Instead of using Expo Go, you build a custom version of the app that includes the BLE code baked in. It still feels like Expo (hot reload, same workflow) but it's your own app installed on your phone.
Your friend runs these commands once:

# Install the BLE library + its expo plugin npx expo install react-native-ble-plx @config-plugins/react-native-ble-plx # Add this to app.json plugins array: # ["react-native-ble-plx", { # "bluetoothAlwaysPermission": "Allow WonkaLift to use Bluetooth" # }] # Then build and install directly to phone npx expo prebuild npx expo run:android # if Android npx expo run:ios # if iPhone (needs Mac + Xcode)

After that he opens this custom app on his phone instead of Expo Go. Everything else works exactly the same.
Important
If he's on iPhone → needs a Mac with Xcode installed. 

Still 100% React Native. Having a Mac just means he can run the npx expo run:ios command which uses Xcode behind the scenes to build and install the app on his iPhone — but he never touches Swift or Xcode directly. He writes all his code in React Native as normal.
The Mac is actually ideal here. Tell him the exact steps:

# 1. Make sure Xcode is installed from App Store (if not already) # 2. Install Xcode command line tools xcode-select --install # 3. In the project folder npx expo install react-native-ble-plx @config-plugins/react-native-ble-plx # 4. Add to app.json inside "plugins": ["react-native-ble-plx", { "bluetoothAlwaysPermission": "Allow WonkaLift to connect to Bluetooth" }] # 5. Build and install directly to his iPhone (phone must be plugged in) npx expo prebuild npx expo run:ios

After step 5, the app installs on his iPhone like a normal app. From then on he just hits save in his code and it hot reloads exactly like Expo Go. The only difference is the first build takes like 5-10 minutes. After that it's fast.
One thing — make sure he starts the RN project with npx create-expo-app not the bare React Native CLI, otherwise the commands above are different.