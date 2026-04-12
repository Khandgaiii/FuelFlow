import { BleManager, Device, Subscription, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
/** Live telemetry — notify ~200ms, READ */
export const LIVE_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
/** Trip aggregates — notify ~5s + READ */
export const TRIP_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a9';
/** Trip history — READ only */
export const HIST_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26aa';
/** RTC sync — write 4-byte LE Unix time or ASCII digits (ESP32 v2) */
export const TIME_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26ab';

/** @deprecated use LIVE_UUID */
export const CHARACTERISTIC_UUID = LIVE_UUID;
export const DEVICE_NAME = 'FuelFlow-ESP32';

export interface Telemetry {
  speed: number;
  rpm: number;
  /** L/100 km (ESP v2: `l100`; legacy: `fuel`) */
  fuelConsumption: number;
  throttlePosition: number;
  battery: number;
  coolant: number;
  oilPressure: number;
  engineLoad: number;
  iat?: number;
  engineRunning?: boolean;
  lph?: number;
  /** km/L */
  kpl?: number;
  /** US MPG */
  mpg?: number;
  /** 0–100 driving score (ESP v2) */
  efficiencyScore?: number;
  hardAccel?: number;
  hardBrake?: number;
}

/** Parsed `trip` object from TRIP_UUID JSON (ESP buildTripJson). */
export interface EspTripStats {
  distanceKm: number;
  fuelLiters: number;
  /** Current-trip average speed (km/h) */
  avgSpeedKmh: number;
  l100: number;
  kpl: number;
  mpg: number;
  durationSec: number;
  score: number;
  hardAccel: number;
  hardBrake: number;
}

/** day / week / month aggregates from TRIP_UUID JSON */
export interface EspAggregatePeriod {
  distanceKm: number;
  fuelLiters: number;
  durationSec: number;
  avgSpeed: number;
  l100: number;
  kpl: number;
  mpg: number;
  score: number;
  tripCount: number;
}

export interface EspTripBroadcast {
  trip: EspTripStats;
  day: EspAggregatePeriod;
  week: EspAggregatePeriod;
  month: EspAggregatePeriod;
  /** ESP RTC time string from JSON `ts` */
  rtcTimeString: string;
}

function parseTripObject(t: Record<string, unknown>): EspTripStats {
  return {
    distanceKm: Number(t.d) || 0,
    fuelLiters: Number(t.f) || 0,
    avgSpeedKmh: Number(t.s) || 0,
    l100: Number(t.l) || 0,
    kpl: Number(t.kpl) || 0,
    mpg: Number(t.mpg) || 0,
    durationSec: Number(t.t) || 0,
    score: Number(t.score) || 0,
    hardAccel: Number(t.ha) || 0,
    hardBrake: Number(t.hb) || 0,
  };
}

function parseAggObject(o: Record<string, unknown>): EspAggregatePeriod {
  return {
    distanceKm: Number(o.d) || 0,
    fuelLiters: Number(o.f) || 0,
    durationSec: Number(o.t) || 0,
    avgSpeed: Number(o.s) || 0,
    l100: Number(o.l) || 0,
    kpl: Number(o.kpl) || 0,
    mpg: Number(o.mpg) || 0,
    score: Number(o.score) || 0,
    tripCount: Number(o.n) || 0,
  };
}

/** Full TRIP characteristic payload (current trip + day/week/month + RTC string). */
export function parseEspTripBroadcast(raw: string | null): EspTripBroadcast | null {
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const tripRaw = j.trip;
    if (!tripRaw || typeof tripRaw !== 'object') return null;
    const dayRaw = j.day;
    const weekRaw = j.week;
    const monthRaw = j.month;
    return {
      trip: parseTripObject(tripRaw as Record<string, unknown>),
      day:
        dayRaw && typeof dayRaw === 'object'
          ? parseAggObject(dayRaw as Record<string, unknown>)
          : parseAggObject({}),
      week:
        weekRaw && typeof weekRaw === 'object'
          ? parseAggObject(weekRaw as Record<string, unknown>)
          : parseAggObject({}),
      month:
        monthRaw && typeof monthRaw === 'object'
          ? parseAggObject(monthRaw as Record<string, unknown>)
          : parseAggObject({}),
      rtcTimeString: typeof j.ts === 'string' ? j.ts : '',
    };
  } catch {
    return null;
  }
}

export function parseEspTripJson(raw: string | null): EspTripStats | null {
  return parseEspTripBroadcast(raw)?.trip ?? null;
}

/** One row from HIST_UUID JSON array (completed trips on SD). */
export interface EspHistTripRow {
  ts: number;
  distanceKm: number;
  fuelLiters: number;
  l100: number;
  kpl: number;
  mpg: number;
  avgSpd: number;
  durationSec: number;
  score: number;
  ha: number;
  hb: number;
}

export function parseEspHistJson(raw: string | null): EspHistTripRow[] {
  if (!raw?.trim()) return [];
  try {
    const arr = JSON.parse(raw) as unknown[];
    if (!Array.isArray(arr)) return [];
    return arr.map(entry => {
      const r = (entry ?? {}) as Record<string, unknown>;
      return {
        ts: Number(r.ts) || 0,
        distanceKm: Number(r.d) || 0,
        fuelLiters: Number(r.f) || 0,
        l100: Number(r.l) || 0,
        kpl: Number(r.kpl) || 0,
        mpg: Number(r.mpg) || 0,
        avgSpd: Number(r.s) || 0,
        durationSec: Number(r.t) || 0,
        score: Number(r.score) || 0,
        ha: Number(r.ha) || 0,
        hb: Number(r.hb) || 0,
      };
    });
  } catch {
    return [];
  }
}

/** Normalized for Diagnostics UI (from ESP `dtcs` in live JSON). */
export interface EspFaultCodeRow {
  id: string;
  code: string;
  description: string;
  severity: 'critical' | 'warning';
  detectedAt: string;
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
type EspFaultListener = (codes: EspFaultCodeRow[]) => void;
type TripJsonListener = (json: string) => void;
type HistJsonListener = (json: string | null) => void;

function base64ToUtf8(b64: string | null | undefined): string {
  if (!b64) return '';
  try {
    return Buffer.from(b64, 'base64').toString('utf-8');
  } catch {
    try {
      return atob(b64);
    } catch {
      return '';
    }
  }
}

function parseDtcs(raw: unknown): EspFaultCodeRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: EspFaultCodeRow[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item === 'string') {
      const code = item.trim();
      if (!code) continue;
      out.push({
        id: `${code}-${i}`,
        code,
        description: '',
        severity: 'warning',
        detectedAt: 'ECU',
      });
      continue;
    }
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const code = String(o.code ?? o.id ?? '').trim();
      if (!code) continue;
      const sev = o.severity === 'critical' ? 'critical' : 'warning';
      out.push({
        id: String(o.id ?? code),
        code,
        description: String(o.description ?? o.desc ?? ''),
        severity: sev,
        detectedAt: String(o.detectedAt ?? o.ts ?? 'ECU'),
      });
    }
  }
  return out;
}

class BleService {
  private manager: BleManager;
  private device: Device | null = null;
  private subscriptionLive: Subscription | null = null;
  private subscriptionTrip: Subscription | null = null;
  private onTelemetry: TelemetryListener | null = null;
  private onStatus: StatusListener | null = null;
  private onEspFaults: EspFaultListener | null = null;
  private onTripJson: TripJsonListener | null = null;
  private onHistJson: HistJsonListener | null = null;
  private status: BleStatus = 'idle';
  private lastLiveJsonRaw: string | null = null;
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

  setEspFaultListener(fn: EspFaultListener | null) {
    this.onEspFaults = fn;
  }

  setTripJsonListener(fn: TripJsonListener | null) {
    this.onTripJson = fn;
  }

  setHistJsonListener(fn: HistJsonListener | null) {
    this.onHistJson = fn;
  }

  getLastLiveJsonRaw(): string | null {
    return this.lastLiveJsonRaw;
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

  private clearSubscriptions() {
    this.subscriptionLive?.remove();
    this.subscriptionLive = null;
    this.subscriptionTrip?.remove();
    this.subscriptionTrip = null;
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

  private handleLivePayload(rawUtf8: string) {
    this.lastLiveJsonRaw = rawUtf8;
    try {
      const parsed = JSON.parse(rawUtf8) as Record<string, unknown>;
      const l100 = Number(parsed.l100 ?? parsed.fuel) || 0;
      const telemetry: Telemetry = {
        speed: Number(parsed.spd) || 0,
        rpm: Number(parsed.rpm) || 0,
        fuelConsumption: l100,
        throttlePosition: Number(parsed.thr) || 0,
        battery: Number(parsed.bat) || 0,
        coolant: Number(parsed.cool) || 0,
        oilPressure: Number(parsed.oil) || 0,
        engineLoad: Number(parsed.eng) || 0,
      };
      if (parsed.iat !== undefined && parsed.iat !== null) {
        telemetry.iat = Number(parsed.iat);
      }
      if (parsed.run !== undefined && parsed.run !== null) {
        telemetry.engineRunning = Boolean(parsed.run);
      }
      if (parsed.lph !== undefined && parsed.lph !== null) {
        telemetry.lph = Number(parsed.lph);
      }
      if (parsed.kpl !== undefined && parsed.kpl !== null) {
        telemetry.kpl = Number(parsed.kpl);
      }
      if (parsed.mpg !== undefined && parsed.mpg !== null) {
        telemetry.mpg = Number(parsed.mpg);
      }
      if (parsed.score !== undefined && parsed.score !== null) {
        telemetry.efficiencyScore = Number(parsed.score);
      }
      if (parsed.ha !== undefined && parsed.ha !== null) {
        telemetry.hardAccel = Number(parsed.ha);
      }
      if (parsed.hb !== undefined && parsed.hb !== null) {
        telemetry.hardBrake = Number(parsed.hb);
      }
      this.onTelemetry?.(telemetry);
      const faults = parseDtcs(parsed.dtcs);
      this.onEspFaults?.(faults);
    } catch (e) {
      console.warn('[BLE] Parse error:', e, rawUtf8);
    }
  }

  private handleTripPayload(rawUtf8: string) {
    if (rawUtf8.length > 0) {
      this.onTripJson?.(rawUtf8);
    }
  }

  private handleHistPayload(rawUtf8: string | null) {
    this.onHistJson?.(rawUtf8);
  }

  /** Device is already connected (from connectToDeviceId or after connect()). */
  private async attachToConnectedDevice(connected: Device): Promise<void> {
    try {
      try {
        await connected.requestMTU(512);
      } catch {
        await connected.requestMTU(185);
      }
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
        this.clearSubscriptions();
        this.lastLiveJsonRaw = null;
        this.onEspFaults?.([]);
        this.handleHistPayload(null);
        this.setStatus('disconnected');
      });

      console.log('[BLE] Starting LIVE + TRIP monitors...');
      this.subscriptionLive = connected.monitorCharacteristicForService(
        SERVICE_UUID,
        LIVE_UUID,
        (error, characteristic) => {
          if (error) {
            console.warn('[BLE] LIVE monitor error:', error.message);
            return;
          }
          if (characteristic?.value) {
            const raw = base64ToUtf8(characteristic.value);
            this.handleLivePayload(raw);
          }
        },
      );

      this.subscriptionTrip = connected.monitorCharacteristicForService(
        SERVICE_UUID,
        TRIP_UUID,
        (error, characteristic) => {
          if (error) {
            console.warn('[BLE] TRIP monitor error:', error.message);
            return;
          }
          if (characteristic?.value) {
            const raw = base64ToUtf8(characteristic.value);
            this.handleTripPayload(raw);
          }
        },
      );

      await Promise.all([
        this.readTripJson().catch(() => ''),
        this.readHistJson().catch(() => ''),
      ]);
    } catch (e: any) {
      this.setStatus('error', e.message);
      throw e;
    }
  }

  /** Current LIVE characteristic value (READ). */
  async readLiveJson(): Promise<string> {
    if (!this.device) throw new Error('Not connected');
    const c = await this.device.readCharacteristicForService(
      SERVICE_UUID,
      LIVE_UUID,
    );
    const raw = base64ToUtf8(c.value);
    if (raw) this.handleLivePayload(raw);
    return raw;
  }

  async readTripJson(): Promise<string> {
    if (!this.device) throw new Error('Not connected');
    const c = await this.device.readCharacteristicForService(
      SERVICE_UUID,
      TRIP_UUID,
    );
    const raw = base64ToUtf8(c.value);
    if (raw) this.handleTripPayload(raw);
    return raw;
  }

  async readHistJson(): Promise<string> {
    if (!this.device) throw new Error('Not connected');
    const c = await this.device.readCharacteristicForService(
      SERVICE_UUID,
      HIST_UUID,
    );
    const raw = base64ToUtf8(c.value);
    this.handleHistPayload(raw || null);
    return raw;
  }

  async disconnect(): Promise<void> {
    this.scanSession++;
    this.clearScanTimer();
    this.manager.stopDeviceScan();
    this.clearSubscriptions();
    this.lastLiveJsonRaw = null;
    this.onEspFaults?.([]);
    this.handleHistPayload(null);
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
