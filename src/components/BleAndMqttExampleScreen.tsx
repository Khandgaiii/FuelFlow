/**
 * Example Component - BLE + MQTT Integration Demo Screen
 *
 * This component demonstrates how to use BLE and MQTT together in the FuelFlow app.
 * You can adapt this for your own screens.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useBle } from '../context/BleContext';
import { useMqtt } from '../context/MqttContext';
import { MqttConfig } from '../services/MqttService';

export const BleAndMqttExampleScreen: React.FC = () => {
  // BLE Hooks
  const {
    isScanning,
    isConnected: bleConnected,
    connectedDeviceName,
    availableDevices,
    scanError,
    connectionError: bleConnectionError,
    startScan,
    stopScan,
    connectToDevice,
    disconnect: bleDisconnect,
    sendData,
    subscribeToNotifications,
  } = useBle();

  // MQTT Hooks
  const {
    isConnected: mqttConnected,
    connectionError: mqttConnectionError,
    connect: mqttConnect,
    disconnect: mqttDisconnect,
    publish,
    subscribe,
  } = useMqtt();

  // Local state
  const [screen, setScreen] = useState<
    'main' | 'ble-scan' | 'ble-data' | 'mqtt'
  >('main');
  const [mqttMessage, setMqttMessage] = useState('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [bleData, setBleData] = useState<string>('');
  const [sendingData, setSendingData] = useState('');

  // MQTT Config
  const mqttConfig: MqttConfig = {
    brokerUrl: 'mqtt.example.com', // Replace with your broker
    clientId: 'fuelflow-device',
    username: 'your-username',
    password: 'your-password',
    ssl: true,
    port: 8884,
  };

  // Subscribe to MQTT messages
  useEffect(() => {
    if (mqttConnected) {
      try {
        subscribe('vehicle/fuel-data', payload => {
          setReceivedMessages(prev => [payload, ...prev.slice(0, 9)]);
        });

        subscribe('vehicle/commands', payload => {
          console.log('Command received:', payload);
        });
      } catch (error) {
        console.error('Failed to subscribe:', error);
      }
    }
  }, [mqttConnected, subscribe]);

  const handleConnectMqtt = async () => {
    try {
      await mqttConnect(mqttConfig);
    } catch (error) {
      console.error('MQTT connection failed:', error);
    }
  };

  const handleSendBleData = async () => {
    try {
      await sendData(sendingData);
      setSendingData('');
    } catch (error) {
      console.error('Failed to send BLE data:', error);
    }
  };

  const handlePublishMqtt = () => {
    try {
      publish('vehicle/fuel-data', mqttMessage);
      setMqttMessage('');
      setReceivedMessages(prev => ['Sent: ' + mqttMessage, ...prev]);
    } catch (error) {
      console.error('Failed to publish:', error);
    }
  };

  const handleSubscribeBleNotifications = async () => {
    try {
      await subscribeToNotifications(data => {
        setBleData(data);
        // Optionally forward to MQTT
        if (mqttConnected) {
          publish('vehicle/ble-stream', data);
        }
      });
    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };

  // Main Menu
  if (screen === 'main') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>BLE + MQTT Integration</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Overview</Text>
          <View style={styles.statusBox}>
            <Text>BLE Connected: {bleConnected ? '✓' : '✗'}</Text>
            <Text>MQTT Connected: {mqttConnected ? '✓' : '✗'}</Text>
            {connectedDeviceName && <Text>Device: {connectedDeviceName}</Text>}
          </View>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => setScreen('ble-scan')}
          >
            <Text style={styles.buttonText}>BLE Device Scanning</Text>
          </TouchableOpacity>

          {bleConnected && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => setScreen('ble-data')}
            >
              <Text style={styles.buttonText}>BLE Data Transfer</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => setScreen('mqtt')}
          >
            <Text style={styles.buttonText}>MQTT Control</Text>
          </TouchableOpacity>
        </View>

        {(bleConnectionError || mqttConnectionError) && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {bleConnectionError || mqttConnectionError}
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // BLE Scanning Screen
  if (screen === 'ble-scan') {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen('main')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Scan for BLE Devices</Text>

        <TouchableOpacity
          style={[
            styles.button,
            isScanning ? styles.dangerButton : styles.successButton,
          ]}
          onPress={isScanning ? stopScan : startScan}
        >
          <Text style={styles.buttonText}>
            {isScanning ? 'Stop Scanning' : 'Start Scanning'}
          </Text>
        </TouchableOpacity>

        {isScanning && (
          <ActivityIndicator
            size="large"
            color="#0000ff"
            style={{ marginVertical: 20 }}
          />
        )}

        {scanError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{scanError}</Text>
          </View>
        )}

        <Text style={styles.subtitle}>
          Available Devices: {availableDevices.length}
        </Text>

        <FlatList
          scrollEnabled={false}
          data={availableDevices}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.deviceItem}>
              <View>
                <Text style={styles.deviceName}>
                  {item.name || 'Unknown Device'}
                </Text>
                <Text style={styles.deviceId}>{item.id}</Text>
                <Text style={styles.deviceRssi}>Signal: {item.rssi} dBm</Text>
              </View>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => {
                  connectToDevice(item.id, item.name || undefined);
                  setScreen('ble-data');
                }}
              >
                <Text style={styles.buttonText}>Connect</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </ScrollView>
    );
  }

  // BLE Data Transfer Screen
  if (screen === 'ble-data') {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen('main')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>BLE Data Transfer</Text>

        {bleConnected && (
          <>
            <View style={styles.statusBox}>
              <Text style={styles.statusGreen}>
                Connected to: {connectedDeviceName}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Send Data</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter data to send"
                value={sendingData}
                onChangeText={setSendingData}
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleSendBleData}
              >
                <Text style={styles.buttonText}>Send</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Receive Data</Text>
              <TouchableOpacity
                style={[styles.button, styles.successButton]}
                onPress={handleSubscribeBleNotifications}
              >
                <Text style={styles.buttonText}>
                  Subscribe to Notifications
                </Text>
              </TouchableOpacity>
              {bleData && (
                <View style={styles.dataBox}>
                  <Text style={styles.dataText}>{bleData}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={() => {
                bleDisconnect();
                setScreen('main');
              }}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  }

  // MQTT Screen
  if (screen === 'mqtt') {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen('main')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>MQTT Control</Text>

        {!mqttConnected ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleConnectMqtt}
          >
            <Text style={styles.buttonText}>Connect to MQTT Broker</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.statusBox}>
              <Text style={styles.statusGreen}>Connected to MQTT</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Publish Message</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter message"
                value={mqttMessage}
                onChangeText={setMqttMessage}
                multiline
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handlePublishMqtt}
              >
                <Text style={styles.buttonText}>
                  Publish to vehicle/fuel-data
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Received Messages</Text>
              <FlatList
                scrollEnabled={false}
                data={receivedMessages}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>{item}</Text>
                  </View>
                )}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={() => {
                mqttDisconnect();
                setReceivedMessages([]);
              }}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </>
        )}

        {mqttConnectionError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{mqttConnectionError}</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statusBox: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorBox: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  dataBox: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  messageBox: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  statusGreen: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  statusText: {
    color: '#333',
    marginVertical: 3,
  },
  errorText: {
    color: '#c62828',
    fontWeight: '600',
  },
  dataText: {
    color: '#1565c0',
    fontWeight: '500',
  },
  messageText: {
    color: '#333',
    fontSize: 12,
  },
  buttonGroup: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  connectButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    minHeight: 40,
  },
  deviceItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  deviceRssi: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  backButton: {
    paddingBottom: 15,
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
});
