import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  bleService,
  Telemetry,
  EMPTY_TELEMETRY,
  BleStatus,
  ScannedDevice,
  EspFaultCodeRow,
  EspTripStats,
  EspTripBroadcast,
  EspHistTripRow,
  parseEspTripBroadcast,
  parseEspHistJson,
} from '../services/BleService';
import {
  initConnectionNotifications,
  notifyDeviceConnected,
  notifyDeviceDisconnected,
} from '../services/connectionNotifications';
import { saveFuelFlowJsonFile } from '../utils/saveJsonFile';

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
  /** DTC-style rows from ESP live JSON `dtcs` (empty if none / disconnected). */
  espFaultCodes: EspFaultCodeRow[];
  /** Latest TRIP characteristic JSON from notify or read. */
  lastTripJson: string | null;
  /** Latest HIST characteristic JSON (read on connect / export). */
  lastHistJson: string | null;
  /** Full TRIP payload: current trip + day/week/month + ESP RTC time string. */
  espTripBroadcast: EspTripBroadcast | null;
  /** Parsed SD trip history (up to 50 rows). */
  espHistTrips: EspHistTripRow[];
  /** Parsed current trip only (convenience). */
  espTripStats: EspTripStats | null;
  /** Save JSON from ESP to app storage; returns file path. */
  downloadBleJson: (
    kind: 'live' | 'trip' | 'hist',
  ) => Promise<{ path: string } | null>;
  /** Re-read LIVE from ESP to refresh `dtcs` / telemetry. */
  refreshEspLive: () => Promise<void>;
  /** Re-read LIVE + TRIP + HIST from ESP (use when opening Dashboard). */
  refreshAllEsp: () => Promise<void>;
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
  const [espFaultCodes, setEspFaultCodes] = useState<EspFaultCodeRow[]>([]);
  const [lastTripJson, setLastTripJson] = useState<string | null>(null);
  const [lastHistJson, setLastHistJson] = useState<string | null>(null);
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

    bleService.setEspFaultListener(codes => {
      if (mounted.current) setEspFaultCodes(codes);
    });

    bleService.setTripJsonListener(json => {
      if (mounted.current) setLastTripJson(json);
    });

    bleService.setHistJsonListener(json => {
      if (!mounted.current) return;
      setLastHistJson(json);
    });

    return () => {
      mounted.current = false;
      bleService.setTelemetryListener(null);
      bleService.setStatusListener(null);
      bleService.setEspFaultListener(null);
      bleService.setTripJsonListener(null);
      bleService.setHistJsonListener(null);
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
    if (mounted.current) {
      setTelemetry(EMPTY_TELEMETRY);
      setEspFaultCodes([]);
      setLastTripJson(null);
      setLastHistJson(null);
    }
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

  const downloadBleJson = useCallback(
    async (kind: 'live' | 'trip' | 'hist'): Promise<{ path: string } | null> => {
      try {
        let body: string;
        if (kind === 'live') {
          body = await bleService.readLiveJson();
          if (!body && bleService.getLastLiveJsonRaw()) {
            body = bleService.getLastLiveJsonRaw() as string;
          }
        } else if (kind === 'trip') {
          body = await bleService.readTripJson();
        } else {
          body = await bleService.readHistJson();
        }
        if (!body?.trim()) {
          throw new Error('Empty response from device');
        }
        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch {
          throw new Error('Invalid JSON from device');
        }
        const wrapped = JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            source: 'esp32_ble',
            kind,
            payload,
          },
          null,
          2,
        );
        const path = await saveFuelFlowJsonFile(kind, wrapped);
        return { path };
      } catch (e: any) {
        setBleError(e?.message ?? String(e));
        return null;
      }
    },
    [],
  );

  const refreshEspLive = useCallback(async () => {
    try {
      await bleService.readLiveJson();
    } catch (e: any) {
      setBleError(e?.message ?? String(e));
    }
  }, []);

  const refreshAllEsp = useCallback(async () => {
    try {
      await Promise.all([
        bleService.readLiveJson().catch(() => {}),
        bleService.readTripJson().catch(() => {}),
        bleService.readHistJson().catch(() => {}),
      ]);
    } catch (e: any) {
      setBleError(e?.message ?? String(e));
    }
  }, []);

  const isConnected = bleStatus === 'connected';

  const espTripBroadcast = useMemo((): EspTripBroadcast | null => {
    if (!isConnected || !lastTripJson) return null;
    return parseEspTripBroadcast(lastTripJson);
  }, [isConnected, lastTripJson]);

  const espTripStats = useMemo((): EspTripStats | null => {
    return espTripBroadcast?.trip ?? null;
  }, [espTripBroadcast]);

  const espHistTrips = useMemo(
    () => (lastHistJson ? parseEspHistJson(lastHistJson) : []),
    [lastHistJson],
  );

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
        espFaultCodes,
        lastTripJson,
        lastHistJson,
        espTripBroadcast,
        espHistTrips,
        espTripStats,
        downloadBleJson,
        refreshEspLive,
        refreshAllEsp,
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
