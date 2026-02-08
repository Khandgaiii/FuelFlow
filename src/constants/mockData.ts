// Mock Data for Vehicle Dashboard

export interface DashboardData {
  speed: number;
  rpm: number;
  fuelConsumption: number;
  throttlePosition: number;
  battery: number;
  coolant: number;
  oilPressure: number;
  engineLoad: number;
}

export interface DiagnosticTag {
  id: string;
  label: string;
  color: string;
}

export interface FaultCode {
  id: string;
  code: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  tags: DiagnosticTag[];
  detectedAt: string;
}

export interface DiagnosticsData {
  totalFaults: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  faultCodes: FaultCode[];
}

// Current vehicle dashboard data
export const dashboardData: DashboardData = {
  speed: 0,
  rpm: 0,
  fuelConsumption: 0,
  throttlePosition: 0,
  battery: 0,
  coolant: 0,
  oilPressure: 0,
  engineLoad: 0,
};

// Diagnostics data
export const diagnosticsData: DiagnosticsData = {
  totalFaults: 6,
  criticalCount: 1,
  warningCount: 2,
  infoCount: 3,
  faultCodes: [
    {
      id: '1',
      code: 'P0300',
      description: 'Random/Multiple Cylinder Misfire Detected',
      severity: 'critical',
      tags: [
        { id: '1', label: 'CRITICAL', color: '#FF3B30' },
        { id: '2', label: 'ENGINE', color: '#FF9500' },
      ],
      detectedAt: '2026-02-04 14:32:15',
    },
    {
      id: '2',
      code: 'P0171',
      description: 'System Too Lean (Bank 1)',
      severity: 'warning',
      tags: [
        { id: '3', label: 'WARNING', color: '#FF9500' },
        { id: '4', label: 'FUEL', color: '#FF9500' },
      ],
      detectedAt: '2026-02-03 10:15:42',
    },
    {
      id: '3',
      code: 'P0128',
      description: 'Coolant Thermostat (Coolant Temp Regulating Thermo)',
      severity: 'warning',
      tags: [
        { id: '5', label: 'WARNING', color: '#FF9500' },
        { id: '6', label: 'COOLING', color: '#FF9500' },
      ],
      detectedAt: '2026-02-02 08:45:20',
    },
    {
      id: '4',
      code: 'P0405',
      description: 'EGR Sensor A Range/Performance',
      severity: 'info',
      tags: [
        { id: '7', label: 'INFO', color: '#34C759' },
        { id: '8', label: 'EMISSIONS', color: '#34C759' },
      ],
      detectedAt: '2026-02-01 16:22:10',
    },
    {
      id: '5',
      code: 'P0420',
      description: 'Catalyst System Efficiency Below Threshold',
      severity: 'info',
      tags: [
        { id: '9', label: 'INFO', color: '#34C759' },
        { id: '10', label: 'EMISSIONS', color: '#34C759' },
      ],
      detectedAt: '2026-01-31 12:05:33',
    },
    {
      id: '6',
      code: 'P0507',
      description: 'Idle Air Control System Malfunction',
      severity: 'info',
      tags: [
        { id: '11', label: 'INFO', color: '#34C759' },
        { id: '12', label: 'ENGINE', color: '#34C759' },
      ],
      detectedAt: '2026-01-30 09:30:45',
    },
  ],
};

// Chart data for fuel consumption history (example)
export const fuelConsumptionHistory = [
  { time: '00:00', value: 7.5 },
  { time: '04:00', value: 7.8 },
  { time: '08:00', value: 8.2 },
  { time: '12:00', value: 7.9 },
  { time: '16:00', value: 8.1 },
  { time: '20:00', value: 7.9 },
  { time: '23:59', value: 7.9 },
];

export const MAX_SPEED = 280;
export const MAX_RPM = 7000;
export const MAX_FUEL_CONSUMPTION = 15;
export const MAX_THROTTLE = 100;
export const MAX_ENGINE_LOAD = 100;
