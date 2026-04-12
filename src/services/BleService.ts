import { BleManager, Device, Subscription, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
export const DEVICE_NAME = 'FuelFlow-ESP32';

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

export interface ScannedDevice {
  id: string;
  name: string;
  rssi: number | null;
}

type TelemetryListener = (data: Telemetry) => void;
type StatusListener = (status: BleStatus, msg?: string) => void;

class BleService {
  private manager: BleManager;
  private device: Device | null = null;
  private subscription: Subscription | null = null;
  private onTelemetry: TelemetryListener | null = null;
  private onStatus: StatusListener | null = null;
  private status: BleStatus = 'idle';
  /** Invalidates stale scan timeouts when a new scan session starts */
  private scanSession = 0;
  private scanTimer: ReturnType<typeof setTimeout> | null = null;

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

  private clearScanTimer() {
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
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
        perms as Array<
          (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS]
        >,
      );
      return Object.values(granted).every(
        v => v === PermissionsAndroid.RESULTS.GRANTED,
      );
    } catch (e) {
      console.warn('[BLE] Permission error:', e);
      return false;
    }
  }

  /** Android: prompt to turn Bluetooth on if it is off (system dialog). */
  async ensureBluetoothPoweredOn(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      let s = await this.manager.state();
      if (s === State.PoweredOn) return true;
      if (s === State.PoweredOff) {
        await this.manager.enable();
        s = await this.manager.state();
      }
      return s === State.PoweredOn;
    } catch (e) {
      console.warn('[BLE] ensureBluetoothPoweredOn:', e);
      return false;
    }
  }

  /** True if already linked to FuelFlow device and link is active */
  async isLinkActive(): Promise<boolean> {
    if (!this.device) return false;
    try {
      return await this.device.isConnected();
    } catch {
      return false;
    }
  }

  /**
   * Auto-find FuelFlow-ESP32 by name or service UUID and connect.
   * Guards against duplicate scans and ignores timeout after a successful connect.
   */
  async scanAndConnect(): Promise<void> {
    const ok = await this.requestPermissions();
    if (!ok) {
      this.setStatus('error', 'Bluetooth permissions denied');
      return;
    }
    const btOn = await this.ensureBluetoothPoweredOn();
    if (!btOn) {
      this.setStatus('error', 'Bluetooth is off — enable it to connect');
      return;
    }

    if (await this.isLinkActive()) {
      this.setStatus('connected');
      return;
    }

    if (this.status === 'scanning' || this.status === 'connecting') {
      return;
    }

    this.manager.stopDeviceScan();
    this.clearScanTimer();

    this.setStatus('scanning');
    const session = ++this.scanSession;

    return new Promise((resolve, reject) => {
      this.scanTimer = setTimeout(() => {
        this.manager.stopDeviceScan();
        this.clearScanTimer();
        if (session !== this.scanSession) return;
        if (this.status === 'connected' || this.status === 'connecting') return;
        this.setStatus('error', 'Device not found — is ESP32 powered on?');
        reject(new Error('Scan timeout'));
      }, 30000);

      this.manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        async (error, scannedDevice) => {
          if (error) {
            this.clearScanTimer();
            if (session !== this.scanSession) return;
            this.manager.stopDeviceScan();
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
            this.clearScanTimer();
            this.manager.stopDeviceScan();
            if (session !== this.scanSession) return;
            console.log(
              `[BLE] Found ${name} (${scannedDevice.id}) RSSI:${scannedDevice.rssi}`,
            );
            try {
              await this.connectScannedDevice(scannedDevice);
              resolve();
            } catch (e: any) {
              reject(e);
            }
          }
        },
      );
    });
  }

  /**
   * Scan for nearby BLE devices (for Connect screen). Does not connect.
   */
  async scanNearbyDevices(durationMs = 12000): Promise<ScannedDevice[]> {
    const ok = await this.requestPermissions();
    if (!ok) throw new Error('Bluetooth permissions denied');
    const btOn = await this.ensureBluetoothPoweredOn();
    if (!btOn) throw new Error('Bluetooth is off — enable it in settings');

    this.manager.stopDeviceScan();
    this.scanSession++;
    const session = this.scanSession;

    const found = new Map<string, ScannedDevice>();

    return new Promise(resolve => {
      this.manager.startDeviceScan(
        null,
        { allowDuplicates: true },
        (error, scannedDevice) => {
          if (error || !scannedDevice || session !== this.scanSession) return;
          const name =
            scannedDevice.name || scannedDevice.localName || 'Unknown device';
          found.set(scannedDevice.id, {
            id: scannedDevice.id,
            name,
            rssi: scannedDevice.rssi ?? null,
          });
        },
      );

      setTimeout(() => {
        if (session !== this.scanSession) return;
        this.manager.stopDeviceScan();
        resolve(
          [...found.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)),
        );
      }, durationMs);
    });
  }

  /** Connect to a specific device id (from discovery list). */
  async connectToDeviceId(deviceId: string): Promise<void> {
    const ok = await this.requestPermissions();
    if (!ok) {
      this.setStatus('error', 'Bluetooth permissions denied');
      return;
    }
    const btOn = await this.ensureBluetoothPoweredOn();
    if (!btOn) {
      this.setStatus('error', 'Bluetooth is off — enable it to connect');
      return;
    }

    this.manager.stopDeviceScan();
    this.clearScanTimer();
    this.scanSession++;

    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch {
        /* noop */
      }
      this.device = null;
    }

    this.setStatus('connecting');
    try {
      const d = await this.manager.connectToDevice(deviceId, {
        timeout: 15000,
      });
      await this.attachToConnectedDevice(d);
    } catch (e: any) {
      this.setStatus('error', e.message ?? 'Connection failed');
      throw e;
    }
  }

  /** Device from scan callback — may need explicit connect. */
  private async connectScannedDevice(d: Device): Promise<void> {
    this.setStatus('connecting');
    try {
      const connected = await d.connect({ timeout: 15000 });
      await this.attachToConnectedDevice(connected);
    } catch (e: any) {
      this.setStatus('error', e.message);
      throw e;
    }
  }

  /** Device is already connected (from connectToDeviceId or after connect()). */
  private async attachToConnectedDevice(connected: Device): Promise<void> {
    try {
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
                raw = Buffer.from(characteristic.value, 'base64').toString(
                  'utf-8',
                );
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
    this.scanSession++;
    this.clearScanTimer();
    this.manager.stopDeviceScan();
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
