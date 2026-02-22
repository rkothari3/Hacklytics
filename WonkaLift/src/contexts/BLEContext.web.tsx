import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { WINDOW_SIZE, N_CHANNELS } from '../constants/ble';

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

function generateFakeWindow(): number[] {
  const window: number[] = [];
  for (let t = 0; t < WINDOW_SIZE; t++) {
    const phase = (t / WINDOW_SIZE) * Math.PI * 2;
    window.push(
      Math.sin(phase) * 3 + Math.random() * 0.5,
      Math.sin(phase) * 8 + Math.random() * 0.3,
      Math.random() * 0.5 - 5,
      Math.sin(phase + 0.5) * 1.5 + Math.random() * 0.1,
      Math.random() * 0.2,
      Math.random() * 0.2,
    );
  }
  return window;
}

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [repEventCount, setRepEventCount] = useState(0);
  const [lastRepTimestamp, setLastRepTimestamp] = useState<number | null>(null);
  const [lastRepWindow, setLastRepWindow] = useState<number[] | null>(null);
  const [error] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScan = useCallback(() => {
    setConnectionState('scanning');
    setTimeout(() => {
      setConnectionState('connecting');
      setTimeout(() => {
        setConnectionState('connected');
        intervalRef.current = setInterval(() => {
          setLastRepWindow(generateFakeWindow());
          setLastRepTimestamp(Date.now());
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
    setLastRepWindow(null);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

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
