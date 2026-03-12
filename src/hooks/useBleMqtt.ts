import { useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { useBle } from '../context/BleContext';
import { useMqtt } from '../context/MqttContext';
import { MqttConfig } from '../services/MqttService';

/**
 * Hook for integrating BLE device with MQTT communication
 * Automatically syncs BLE data to MQTT and vice versa
 */
export const useBleToMqtt = (
  mqttConfig?: MqttConfig,
  options?: {
    bleToMqttTopic?: string;
    mqttToBleTopic?: string;
    autoConnect?: boolean;
  },
) => {
  const {
    isConnected: bleConnected,
    sendData,
    readData,
    subscribeToNotifications,
  } = useBle();
  const { isConnected: mqttConnected, connect, subscribe, publish } = useMqtt();
  const dataBufferRef = useRef<string>('');

  // Initialize MQTT if provided
  useEffect(() => {
    if (mqttConfig && options?.autoConnect !== false) {
      connect(mqttConfig).catch(error => {
        console.error('Failed to auto-connect to MQTT:', error);
      });
    }
  }, [mqttConfig, connect, options?.autoConnect]);

  // Subscribe to BLE notifications and forward to MQTT
  useEffect(() => {
    if (bleConnected && mqttConnected && options?.bleToMqttTopic) {
      subscribeToNotifications(data => {
        try {
          if (options.bleToMqttTopic) {
            publish(options.bleToMqttTopic, data);
          }
        } catch (error) {
          console.error('Failed to publish BLE data to MQTT:', error);
        }
      }).catch(error => {
        console.error('Failed to subscribe to BLE notifications:', error);
      });
    }
  }, [
    bleConnected,
    mqttConnected,
    subscribeToNotifications,
    publish,
    options?.bleToMqttTopic,
  ]);

  // Subscribe to MQTT topic and send to BLE
  useEffect(() => {
    if (mqttConnected && bleConnected && options?.mqttToBleTopic) {
      try {
        subscribe(options.mqttToBleTopic, payload => {
          sendData(payload).catch(error => {
            console.error('Failed to send MQTT data via BLE:', error);
          });
        });
      } catch (error) {
        console.error('Failed to subscribe to MQTT topic:', error);
      }
    }
  }, [
    mqttConnected,
    bleConnected,
    subscribe,
    sendData,
    options?.mqttToBleTopic,
  ]);

  return {
    bleConnected,
    mqttConnected,
    isFullyConnected: bleConnected && mqttConnected,
  };
};

/**
 * Hook for device scanning with auto-stop after timeout
 */
export const useBleScanning = (autoStopMs?: number) => {
  const { isScanning, startScan, stopScan, availableDevices, scanError } =
    useBle();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginScan = useCallback(() => {
    startScan().catch(error => {
      console.error('Failed to start BLE scan:', error);
    });

    if (autoStopMs) {
      timeoutRef.current = setTimeout(() => {
        stopScan();
      }, autoStopMs);
    }
  }, [startScan, stopScan, autoStopMs]);

  const cancelScan = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopScan();
  }, [stopScan]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isScanning,
    availableDevices,
    scanError,
    startScanning: beginScan,
    stopScanning: cancelScan,
  };
};

/**
 * Hook for continuous data reading from BLE device
 */
export const useBleDataReader = (
  intervalMs: number = 1000,
  autoStart: boolean = false,
) => {
  const { isConnected, readData } = useBle();
  const [isReading, setIsReading] = React.useState(false);
  const [latestData, setLatestData] = React.useState<string | null>(null);
  const [readError, setReadError] = React.useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startReading = useCallback(() => {
    if (isReading || !isConnected) return;

    setIsReading(true);
    setReadError(null);

    intervalRef.current = setInterval(() => {
      readData()
        .then(data => {
          setLatestData(data);
          setReadError(null);
        })
        .catch(error => {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to read data';
          setReadError(errorMessage);
        });
    }, intervalMs);
  }, [isReading, isConnected, readData, intervalMs]);

  const stopReading = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsReading(false);
  }, []);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && isConnected && !isReading) {
      startReading();
    }
  }, [autoStart, isConnected, isReading, startReading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isReading,
    latestData,
    readError,
    startReading,
    stopReading,
  };
};
