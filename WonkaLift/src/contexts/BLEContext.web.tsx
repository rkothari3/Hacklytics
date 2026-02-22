import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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

// Web mock — simulates a BLE connection and fires a rep event every 3 seconds
// so the full workout UI can be tested in the browser without hardware.
export function BLEProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [repEventCount, setRepEventCount] = useState(0);
  const [lastRepTimestamp, setLastRepTimestamp] = useState<number | null>(null);
  const [error] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScan = useCallback(() => {
    setConnectionState('scanning');

    // Simulate scan finding the device after 800ms, then connecting after another 200ms
    setTimeout(() => {
      setConnectionState('connecting');
      setTimeout(() => {
        setConnectionState('connected');

        // Fire a simulated rep every 3 seconds while connected
        intervalRef.current = setInterval(() => {
          const ts = Date.now();
          setLastRepTimestamp(ts);
          setRepEventCount((n) => n + 1);
        }, 3000);
      }, 200);
    }, 800);
  }, []);

  const disconnect = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setConnectionState('disconnected');
    setRepEventCount(0);
    setLastRepTimestamp(null);
  }, []);

  // Clean up interval if the provider unmounts while connected
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
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
