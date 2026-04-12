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
  ScannedDevice,
} from '../services/BleService';
import {
  initConnectionNotifications,
  notifyDeviceConnected,
  notifyDeviceDisconnected,
} from '../services/connectionNotifications';

interface TelemetryContextType {
  telemetry: Telemetry;
  bleStatus: BleStatus;
  bleError: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  discoveredDevices: ScannedDevice[];
  isDiscovering: boolean;
  scanForDevices: () => Promise<void>;
  connectToDeviceId: (deviceId: string) => Promise<void>;
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
  const [discoveredDevices, setDiscoveredDevices] = useState<ScannedDevice[]>(
    [],
  );
  const [isDiscovering, setIsDiscovering] = useState(false);
  const mounted = useRef(true);
  const prevBleStatus = useRef<BleStatus | null>(null);

  useEffect(() => {
    mounted.current = true;
    initConnectionNotifications().catch(() => {});

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

  useEffect(() => {
    const prev = prevBleStatus.current;
    prevBleStatus.current = bleStatus;
    if (prev === null) return;

    if (bleStatus === 'connected' && prev !== 'connected') {
      notifyDeviceConnected().catch(() => {});
    } else if (
      prev === 'connected' &&
      (bleStatus === 'idle' ||
        bleStatus === 'disconnected' ||
        bleStatus === 'error')
    ) {
      notifyDeviceDisconnected().catch(() => {});
    }
  }, [bleStatus]);

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

  const scanForDevices = useCallback(async () => {
    setBleError(null);
    setIsDiscovering(true);
    setDiscoveredDevices([]);
    try {
      const list = await bleService.scanNearbyDevices(12000);
      if (mounted.current) setDiscoveredDevices(list);
    } catch (e: any) {
      if (mounted.current) setBleError(e.message ?? 'Scan failed');
    } finally {
      if (mounted.current) setIsDiscovering(false);
    }
  }, []);

  const connectToDeviceId = useCallback(async (deviceId: string) => {
    setBleError(null);
    try {
      await bleService.connectToDeviceId(deviceId);
    } catch (e: any) {
      if (mounted.current) setBleError(e.message);
      throw e;
    }
  }, []);

  const isConnected = bleStatus === 'connected';

  return (
    <TelemetryContext.Provider
      value={{
        telemetry,
        bleStatus,
        bleError,
        isConnected,
        connect,
        disconnect,
        discoveredDevices,
        isDiscovering,
        scanForDevices,
        connectToDeviceId,
      }}
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
