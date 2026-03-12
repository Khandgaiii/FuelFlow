import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { bleService, BleDevice } from '../services/BleService';

export interface BleContextType {
  isScanning: boolean;
  isConnected: boolean;
  connectedDeviceName: string | null;
  availableDevices: BleDevice[];
  scanError: string | null;
  connectionError: string | null;

  // Methods
  startScan: () => Promise<void>;
  stopScan: () => void;
  connectToDevice: (deviceId: string, deviceName?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendData: (data: string) => Promise<void>;
  readData: () => Promise<string>;
  subscribeToNotifications: (callback: (data: string) => void) => Promise<void>;
  clearErrors: () => void;
}

export const BleContext = createContext<BleContextType | undefined>(undefined);

export const BleProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(
    null,
  );
  const [availableDevices, setAvailableDevices] = useState<BleDevice[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const startScan = useCallback(async () => {
    try {
      setScanError(null);
      setAvailableDevices([]);
      setIsScanning(true);

      await bleService.startScan(
        device => {
          setAvailableDevices(prev => {
            // Avoid duplicates
            const exists = prev.some(d => d.id === device.id);
            return exists ? prev : [...prev, device];
          });
        },
        error => {
          console.error('Scan error:', error);
          setScanError(error.message);
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start scan';
      setScanError(errorMessage);
      setIsScanning(false);
    }
  }, []);

  const stopScan = useCallback(() => {
    bleService.stopScan();
    setIsScanning(false);
  }, []);

  const connectToDevice = useCallback(
    async (deviceId: string, deviceName?: string) => {
      try {
        setConnectionError(null);
        stopScan();

        await bleService.connectToDevice(deviceId);

        setIsConnected(true);
        setConnectedDeviceName(deviceName || null);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to connect to device';
        setConnectionError(errorMessage);
        setIsConnected(false);
      }
    },
    [stopScan],
  );

  const disconnect = useCallback(async () => {
    try {
      await bleService.disconnect();
      setIsConnected(false);
      setConnectedDeviceName(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to disconnect';
      setConnectionError(errorMessage);
    }
  }, []);

  const sendData = useCallback(async (data: string) => {
    try {
      setConnectionError(null);
      await bleService.writeData(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send data';
      setConnectionError(errorMessage);
      throw error;
    }
  }, []);

  const readData = useCallback(async (): Promise<string> => {
    try {
      setConnectionError(null);
      return await bleService.readData();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to read data';
      setConnectionError(errorMessage);
      throw error;
    }
  }, []);

  const subscribeToNotifications = useCallback(
    async (callback: (data: string) => void) => {
      try {
        setConnectionError(null);
        await bleService.subscribeToCharacteristic(callback, error => {
          setConnectionError(error.message);
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to subscribe';
        setConnectionError(errorMessage);
        throw error;
      }
    },
    [],
  );

  const clearErrors = useCallback(() => {
    setScanError(null);
    setConnectionError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        bleService.stopScan();
      }
    };
  }, [isScanning]);

  const value: BleContextType = {
    isScanning,
    isConnected,
    connectedDeviceName,
    availableDevices,
    scanError,
    connectionError,
    startScan,
    stopScan,
    connectToDevice,
    disconnect,
    sendData,
    readData,
    subscribeToNotifications,
    clearErrors,
  };

  return <BleContext.Provider value={value}>{children}</BleContext.Provider>;
};

export const useBle = () => {
  const context = React.useContext(BleContext);
  if (!context) {
    throw new Error('useBle must be used within BleProvider');
  }
  return context;
};
