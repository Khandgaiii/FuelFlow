import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  bleService,
  Telemetry,
  EMPTY_TELEMETRY,
  BleStatus,
} from '../services/BleService';

interface TelemetryContextType {
  telemetry: Telemetry;
  bleStatus: BleStatus;
  bleError: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(
  undefined,
);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [telemetry, setTelemetry] = useState<Telemetry>(EMPTY_TELEMETRY);
  const [bleStatus, setBleStatus] = useState<BleStatus>('idle');
  const [bleError, setBleError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    bleService.setTelemetryListener(data => {
      if (mounted.current) setTelemetry(data);
    });

    bleService.setStatusListener((status, msg) => {
      if (!mounted.current) return;
      setBleStatus(status);
      if (status === 'error') {
        setBleError(msg ?? 'Unknown error');
      } else {
        setBleError(null);
      }
    });

    return () => {
      mounted.current = false;
      bleService.setTelemetryListener(null);
      bleService.setStatusListener(null);
    };
  }, []);

  const connect = useCallback(async () => {
    setBleError(null);
    try {
      await bleService.scanAndConnect();
    } catch (e: any) {
      if (mounted.current) setBleError(e.message);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await bleService.disconnect();
    if (mounted.current) setTelemetry(EMPTY_TELEMETRY);
  }, []);

  const isConnected = bleStatus === 'connected';

  return (
    <TelemetryContext.Provider
      value={{ telemetry, bleStatus, bleError, isConnected, connect, disconnect }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = (): TelemetryContextType => {
  const ctx = useContext(TelemetryContext);
  if (!ctx) {
    throw new Error('useTelemetry must be used within TelemetryProvider');
  }
  return ctx;
};
