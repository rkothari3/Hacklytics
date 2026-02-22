import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import {
  SERVICE_UUID,
  REP_CHAR_UUID,
  WIN_CHAR_UUID,
  WONKA_DEVICE_NAME,
  TOTAL_CHUNKS,
  WINDOW_SIZE,
  N_CHANNELS,
} from '../constants/ble';

export type ConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected';

interface BLEContextValue {
  connectionState: ConnectionState;
  repEventCount: number;
  lastRepTimestamp: number | null;
  lastRepWindow: number[] | null;
  error: string | null;
  startScan: () => void;
  disconnect: () => void;
}

const BLEContext = createContext<BLEContextValue | null>(null);

const SCAN_TIMEOUT_MS = 15000;

function isWonkaDevice(device: Device): boolean {
  return device.name === WONKA_DEVICE_NAME || device.localName === WONKA_DEVICE_NAME;
}

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const managerRef = useRef(new BleManager());
  const deviceRef = useRef<Device | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chunkBufferRef = useRef<(Float32Array | null)[]>(new Array(TOTAL_CHUNKS).fill(null));
  const chunksReceivedRef = useRef(0);
  const assembledWindowRef = useRef<number[] | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [repEventCount, setRepEventCount] = useState(0);
  const [lastRepTimestamp, setLastRepTimestamp] = useState<number | null>(null);
  const [lastRepWindow, setLastRepWindow] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assembleWindow = useCallback((): number[] | null => {
    if (chunksReceivedRef.current < TOTAL_CHUNKS) return null;
    const floats: number[] = [];
    for (let i = 0; i < TOTAL_CHUNKS; i++) {
      const chunk = chunkBufferRef.current[i];
      if (!chunk) return null;
      for (let j = 0; j < chunk.length; j++) {
        floats.push(chunk[j]);
      }
    }
    return floats.length === WINDOW_SIZE * N_CHANNELS ? floats : null;
  }, []);

  const resetChunkBuffer = useCallback(() => {
    chunkBufferRef.current = new Array(TOTAL_CHUNKS).fill(null);
    chunksReceivedRef.current = 0;
  }, []);

  const beginScan = useCallback(
    (manager: BleManager) => {
      setConnectionState('scanning');

      scanTimerRef.current = setTimeout(() => {
        manager.stopDeviceScan();
        setError('Scan timed out. Make sure the wristband is powered on and nearby.');
        setConnectionState('disconnected');
      }, SCAN_TIMEOUT_MS);

      manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (err, device) => {
          if (err) {
            if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
            setError(err.message);
            setConnectionState('disconnected');
            return;
          }
          if (!device) return;

          // Log every device so we can see what iOS is picking up
          if (device.name || device.localName) {
            console.log(
              '[BLE] Found:',
              device.name ?? '(null)',
              '|',
              device.localName ?? '(null)',
              '|',
              device.id,
              '| services:',
              device.serviceUUIDs,
            );
          }

          if (!isWonkaDevice(device)) return;

          if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
          manager.stopDeviceScan();
          setConnectionState('connecting');

        device
          .connect()
          .then((d) => d.discoverAllServicesAndCharacteristics())
          .then((d) => {
            deviceRef.current = d;
            setConnectionState('connected');

            d.monitorCharacteristicForService(SERVICE_UUID, WIN_CHAR_UUID, (notifErr, char) => {
              if (notifErr || !char?.value) return;

              const raw = Buffer.from(char.value, 'base64');
              const chunkIdx = raw.readUInt8(0);
              const payloadBytes = raw.length - 2;
              const nFloats = payloadBytes / 4;
              const floats = new Float32Array(nFloats);
              for (let i = 0; i < nFloats; i++) {
                floats[i] = raw.readFloatLE(2 + i * 4);
              }

              chunkBufferRef.current[chunkIdx] = floats;
              chunksReceivedRef.current++;

              if (chunksReceivedRef.current >= TOTAL_CHUNKS) {
                assembledWindowRef.current = assembleWindow();
                console.log('[BLE] Window pre-assembled:', assembledWindowRef.current?.length ?? 0, 'floats');
              }
            });

            d.monitorCharacteristicForService(SERVICE_UUID, REP_CHAR_UUID, (notifErr, char) => {
              if (notifErr) {
                setError(notifErr.message);
                setConnectionState('disconnected');
                return;
              }
              if (!char?.value) return;

              const ts = Date.now();
              const win = assembledWindowRef.current ?? assembleWindow();
              console.log('[BLE] Rep fired. Window:', win ? `${win.length} floats` : 'null', '| chunks:', chunksReceivedRef.current);
              assembledWindowRef.current = null;
              setLastRepWindow(win);
              setLastRepTimestamp(ts);
              setRepEventCount((n) => n + 1);
              resetChunkBuffer();
            });
          })
          .catch((connectErr) => {
            setError(connectErr.message);
            setConnectionState('disconnected');
          });
      });
    },
    [assembleWindow, resetChunkBuffer],
  );

  const startScan = useCallback(() => {
    const manager = managerRef.current;
    setError(null);

    const sub = manager.onStateChange((state) => {
      console.log('[BLE] Adapter state:', state);
      if (state === State.PoweredOn) {
        sub.remove();
        beginScan(manager);
      } else if (state === State.Unauthorized) {
        sub.remove();
        setError('Bluetooth permission denied. Enable it in Settings > WonkaLift.');
        setConnectionState('disconnected');
      } else if (state === State.PoweredOff) {
        sub.remove();
        setError('Bluetooth is turned off. Enable it in Settings.');
        setConnectionState('disconnected');
      }
    }, true);
  }, [beginScan]);

  const disconnect = useCallback(() => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    deviceRef.current?.cancelConnection();
    deviceRef.current = null;
    setConnectionState('disconnected');
    setRepEventCount(0);
    setLastRepTimestamp(null);
    setLastRepWindow(null);
    resetChunkBuffer();
  }, [resetChunkBuffer]);

  return (
    <BLEContext.Provider
      value={{ connectionState, repEventCount, lastRepTimestamp, lastRepWindow, error, startScan, disconnect }}
    >
      {children}
    </BLEContext.Provider>
  );
}

export function useBLE(): BLEContextValue {
  const ctx = useContext(BLEContext);
  if (!ctx) throw new Error('useBLE must be used inside BLEProvider');
  return ctx;
}
