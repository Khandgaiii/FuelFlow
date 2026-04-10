import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const DEVICE_NAME = 'FuelFlow-ESP32';

export interface Telemetry {
  speed: number;
  rpm: number;
  fuelConsumption: number;
  throttlePosition: number;
  battery: number;
  coolant: number;
  oilPressure: number;
  engineLoad: number;
}

export const EMPTY_TELEMETRY: Telemetry = {
  speed: 0,
  rpm: 0,
  fuelConsumption: 0,
  throttlePosition: 0,
  battery: 0,
  coolant: 0,
  oilPressure: 0,
  engineLoad: 0,
};

export type BleStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

type TelemetryListener = (data: Telemetry) => void;
type StatusListener = (status: BleStatus, msg?: string) => void;

class BleService {
  private manager: BleManager;
  private device: Device | null = null;
  private subscription: Subscription | null = null;
  private onTelemetry: TelemetryListener | null = null;
  private onStatus: StatusListener | null = null;
  private status: BleStatus = 'idle';

  constructor() {
    this.manager = new BleManager();
  }

  setTelemetryListener(fn: TelemetryListener | null) {
    this.onTelemetry = fn;
  }

  setStatusListener(fn: StatusListener | null) {
    this.onStatus = fn;
  }

  getStatus(): BleStatus {
    return this.status;
  }

  private setStatus(s: BleStatus, msg?: string) {
    this.status = s;
    this.onStatus?.(s, msg);
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const perms: string[] = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];
      if (Number(Platform.Version) >= 31) {
        perms.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        );
      }
      const granted = await PermissionsAndroid.requestMultiple(
        perms as Array<(typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS]>,
      );
      return Object.values(granted).every(
        v => v === PermissionsAndroid.RESULTS.GRANTED,
      );
    } catch (e) {
      console.warn('[BLE] Permission error:', e);
      return false;
    }
  }

  async scanAndConnect(): Promise<void> {
    const ok = await this.requestPermissions();
    if (!ok) {
      this.setStatus('error', 'Bluetooth permissions denied');
      return;
    }

    this.setStatus('scanning');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        this.setStatus('error', 'Device not found — is ESP32 powered on?');
        reject(new Error('Scan timeout'));
      }, 20000);

      this.manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        async (error, scannedDevice) => {
          if (error) {
            clearTimeout(timeout);
            this.setStatus('error', error.message);
            reject(error);
            return;
          }

          if (!scannedDevice) return;

          const name = scannedDevice.name || scannedDevice.localName || '';
          const matchesName = name === DEVICE_NAME;
          const svcUuids = scannedDevice.serviceUUIDs ?? [];
          const matchesUuid = svcUuids.some(
            u => u.toLowerCase() === SERVICE_UUID.toLowerCase(),
          );

          if (matchesName || matchesUuid) {
            clearTimeout(timeout);
            this.manager.stopDeviceScan();
            console.log(
              `[BLE] Found ${name} (${scannedDevice.id}) RSSI:${scannedDevice.rssi}`,
            );
            try {
              await this.connectToDevice(scannedDevice);
              resolve();
            } catch (e: any) {
              reject(e);
            }
          }
        },
      );
    });
  }

  private async connectToDevice(d: Device): Promise<void> {
    this.setStatus('connecting');
    try {
      const connected = await d.connect({ timeout: 10000 });
      await connected.requestMTU(185);
      await connected.discoverAllServicesAndCharacteristics();
      this.device = connected;

      const services = await connected.services();
      console.log('[BLE] Services found:', services.map(s => s.uuid));
      for (const svc of services) {
        const chars = await svc.characteristics();
        console.log(`[BLE]   ${svc.uuid} -> chars:`, chars.map(c => c.uuid));
      }

      this.setStatus('connected');

      connected.onDisconnected(() => {
        this.device = null;
        this.subscription?.remove();
        this.subscription = null;
        this.setStatus('disconnected');
      });

      console.log('[BLE] Starting characteristic monitor...');
      this.subscription = connected.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.warn('[BLE] Monitor error:', error.message);
            return;
          }
          if (characteristic?.value) {
            try {
              let raw: string;
              try {
                raw = Buffer.from(characteristic.value, 'base64').toString('utf-8');
              } catch {
                raw = atob(characteristic.value);
              }
              const parsed = JSON.parse(raw);
              const telemetry: Telemetry = {
                speed: Number(parsed.spd) || 0,
                rpm: Number(parsed.rpm) || 0,
                fuelConsumption: Number(parsed.fuel) || 0,
                throttlePosition: Number(parsed.thr) || 0,
                battery: Number(parsed.bat) || 0,
                coolant: Number(parsed.cool) || 0,
                oilPressure: Number(parsed.oil) || 0,
                engineLoad: Number(parsed.eng) || 0,
              };
              this.onTelemetry?.(telemetry);
            } catch (e) {
              console.warn('[BLE] Parse error:', e, characteristic.value);
            }
          }
        },
      );
    } catch (e: any) {
      this.setStatus('error', e.message);
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    this.subscription?.remove();
    this.subscription = null;
    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch {
        // already disconnected
      }
      this.device = null;
    }
    this.setStatus('idle');
  }

  destroy() {
    this.disconnect();
    this.manager.destroy();
  }
}

export const bleService = new BleService();
