import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { CHARACTERISTIC_UUID, SERVICE_UUID, WONKA_DEVICE_NAME } from '../constants/ble';

export type ConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected';

interface BLEContextValue {
  connectionState: ConnectionState;
  repEventCount: number;
  lastRepTimestamp: number | null;
  error: string | null;
  startScan: () => void;
  disconnect: () => void;
}

const BLEContext = createContext<BLEContextValue | null>(null);

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const managerRef = useRef<BleManager>(new BleManager());
  const deviceRef = useRef<Device | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [repEventCount, setRepEventCount] = useState(0);
  const [lastRepTimestamp, setLastRepTimestamp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScan = useCallback(() => {
    const manager = managerRef.current;
    setError(null);
    setConnectionState('scanning');

    manager.startDeviceScan(null, null, (err, device) => {
      if (err) {
        setError(err.message);
        setConnectionState('disconnected');
        return;
      }
      if (!device || device.name !== WONKA_DEVICE_NAME) return;

      manager.stopDeviceScan();
      setConnectionState('connecting');

      device
        .connect()
        .then((d) => d.discoverAllServicesAndCharacteristics())
        .then((d) => {
          deviceRef.current = d;
          setConnectionState('connected');

          d.monitorCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID, (notifErr, char) => {
            if (notifErr) {
              setError(notifErr.message);
              setConnectionState('disconnected');
              return;
            }
            if (!char?.value) return;

            // Each notification = 1 rep. We use arrival time, not the count value.
            Buffer.from(char.value, 'base64').readUInt8(0); // parse to validate payload
            const ts = Date.now();
            setLastRepTimestamp(ts);
            setRepEventCount((n) => n + 1);
          });
        })
        .catch((connectErr) => {
          setError(connectErr.message);
          setConnectionState('disconnected');
        });
    });
  }, []);

  const disconnect = useCallback(() => {
    deviceRef.current?.cancelConnection();
    deviceRef.current = null;
    setConnectionState('disconnected');
    setRepEventCount(0);
    setLastRepTimestamp(null);
  }, []);

  return (
    <BLEContext.Provider value={{ connectionState, repEventCount, lastRepTimestamp, error, startScan, disconnect }}>
      {children}
    </BLEContext.Provider>
  );
}

export function useBLE(): BLEContextValue {
  const ctx = useContext(BLEContext);
  if (!ctx) throw new Error('useBLE must be used inside BLEProvider');
  return ctx;
}
