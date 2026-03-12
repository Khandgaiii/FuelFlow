import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { mqttService, MqttConfig } from '../services/MqttService';

export interface MqttContextType {
  isConnected: boolean;
  connectionError: string | null;
  subscriptions: string[];

  // Methods
  connect: (config: MqttConfig) => Promise<void>;
  disconnect: () => void;
  publish: (
    topic: string,
    payload: string,
    options?: { qos?: number; retain?: boolean },
  ) => void;
  subscribe: (
    topic: string,
    onMessage: (payload: string) => void,
    options?: { qos?: number },
  ) => void;
  unsubscribe: (topic: string) => void;
  clearError: () => void;
}

export const MqttContext = createContext<MqttContextType | undefined>(
  undefined,
);

export const MqttProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  const connect = useCallback(async (config: MqttConfig) => {
    try {
      setConnectionError(null);
      await mqttService.connect(config);
      setIsConnected(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to connect to MQTT broker';
      setConnectionError(errorMessage);
      setIsConnected(false);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    try {
      mqttService.disconnect();
      setIsConnected(false);
      setSubscriptions([]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to disconnect';
      setConnectionError(errorMessage);
    }
  }, []);

  const publish = useCallback(
    (
      topic: string,
      payload: string,
      options?: { qos?: number; retain?: boolean },
    ) => {
      try {
        setConnectionError(null);
        mqttService.publish(topic, payload, options);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to publish message';
        setConnectionError(errorMessage);
        throw error;
      }
    },
    [],
  );

  const subscribe = useCallback(
    (
      topic: string,
      onMessage: (payload: string) => void,
      options?: { qos?: number },
    ) => {
      try {
        setConnectionError(null);
        mqttService.subscribe(topic, onMessage, options);
        setSubscriptions(prev =>
          prev.includes(topic) ? prev : [...prev, topic],
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to subscribe to topic';
        setConnectionError(errorMessage);
        throw error;
      }
    },
    [],
  );

  const unsubscribe = useCallback((topic: string) => {
    try {
      setConnectionError(null);
      mqttService.unsubscribe(topic);
      setSubscriptions(prev => prev.filter(t => t !== topic));
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to unsubscribe from topic';
      setConnectionError(errorMessage);
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setConnectionError(null);
  }, []);

  const value: MqttContextType = {
    isConnected,
    connectionError,
    subscriptions,
    connect,
    disconnect,
    publish,
    subscribe,
    unsubscribe,
    clearError,
  };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
};

export const useMqtt = () => {
  const context = React.useContext(MqttContext);
  if (!context) {
    throw new Error('useMqtt must be used within MqttProvider');
  }
  return context;
};
