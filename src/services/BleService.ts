import {
  BleManager,
  Device,
  Characteristic,
  Service,
} from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import * as base64 from 'base-64';

export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
  isConnected: boolean;
}

class BleServiceClass {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private characteristic: Characteristic | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  /**
   * Request Bluetooth permissions from the user
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);

      if (apiLevel >= 31) {
        // For Android 12+
        const scanGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          {
            title: 'Bluetooth Scan Permission',
            message: 'FuelFlow needs permission to scan for Bluetooth devices',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        const connectGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          {
            title: 'Bluetooth Connect Permission',
            message:
              'FuelFlow needs permission to connect to Bluetooth devices',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        return (
          scanGranted === PermissionsAndroid.RESULTS.GRANTED &&
          connectGranted === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // For Android < 12
        const locationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'FuelFlow needs location access to scan for Bluetooth devices',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        return locationGranted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }

    // iOS permissions are handled via Info.plist
    return true;
  }

  /**
   * Start scanning for BLE devices
   */
  async startScan(
    onDeviceFound: (device: BleDevice) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();

      if (!hasPermission) {
        throw new Error('Bluetooth permissions denied');
      }

      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          onError(error);
          return;
        }

        if (device) {
          const bleDevice: BleDevice = {
            id: device.id,
            name: device.name,
            rssi: device.rssi,
            isConnected: false,
          };

          onDeviceFound(bleDevice);
        }
      });
    } catch (error) {
      onError(error as Error);
    }
  }

  /**
   * Stop scanning for devices
   */
  stopScan(): void {
    this.manager.stopDeviceScan();
  }

  /**
   * Connect to a specific BLE device
   */
  async connectToDevice(
    deviceId: string,
    characteristicUUID?: string,
    serviceUUID?: string,
  ): Promise<Device> {
    try {
      const device = await this.manager.connectToDevice(deviceId);

      await device.discoverAllServicesAndCharacteristics();

      this.connectedDevice = device;

      // Store characteristic if UUIDs provided
      if (serviceUUID && characteristicUUID) {
        const services = await device.services();
        const service = services.find(
          s => s.uuid.toLowerCase() === serviceUUID.toLowerCase(),
        );

        if (service) {
          const characteristics = await service.characteristics();
          this.characteristic =
            characteristics.find(
              c => c.uuid.toLowerCase() === characteristicUUID.toLowerCase(),
            ) || null;
        }
      }

      return device;
    } catch (error) {
      throw new Error(`Failed to connect to device: ${error}`);
    }
  }

  /**
   * Disconnect from current device
   */
  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await this.manager.cancelDeviceConnection(this.connectedDevice.id);
        this.connectedDevice = null;
        this.characteristic = null;
      } catch (error) {
        throw new Error(`Failed to disconnect: ${error}`);
      }
    }
  }

  /**
   * Write data to a characteristic
   */
  async writeData(data: string): Promise<void> {
    if (!this.characteristic || !this.connectedDevice) {
      throw new Error('No device or characteristic connected');
    }

    try {
      const base64Data = base64.encode(data);
      await this.characteristic.writeWithResponse(base64Data);
    } catch (error) {
      throw new Error(`Failed to write data: ${error}`);
    }
  }

  /**
   * Read data from characteristic
   */
  async readData(): Promise<string> {
    if (!this.characteristic || !this.connectedDevice) {
      throw new Error('No device or characteristic connected');
    }

    try {
      const characteristic = await this.characteristic.read();
      if (characteristic.value) {
        return base64.decode(characteristic.value);
      }
      return '';
    } catch (error) {
      throw new Error(`Failed to read data: ${error}`);
    }
  }

  /**
   * Subscribe to characteristic notifications
   */
  async subscribeToCharacteristic(
    onData: (data: string) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    if (!this.characteristic || !this.connectedDevice) {
      onError(new Error('No device or characteristic connected'));
      return;
    }

    try {
      this.characteristic.monitor((error, characteristic) => {
        if (error) {
          onError(error);
          return;
        }

        if (characteristic?.value) {
          const data = Buffer.from(characteristic.value, 'base64').toString(
            'utf8',
          );
          onData(data);
        }
      });
    } catch (error) {
      onError(error as Error);
    }
  }

  /**
   * Get connected device info
   */
  getConnectedDevice(): Device | null {
    return this.connectedDevice;
  }

  /**
   * Check if device is currently connected
   */
  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  /**
   * Destroy the BLE manager
   */
  destroy(): void {
    this.manager.destroy();
  }
}

export const bleService = new BleServiceClass();
