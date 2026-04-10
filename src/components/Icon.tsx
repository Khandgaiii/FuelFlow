import React from 'react';
import MCI from 'react-native-vector-icons/MaterialCommunityIcons';

export type IconName =
  | 'bell'
  | 'calendar-clock'
  | 'chevron-right'
  | 'circle-alert'
  | 'circle-check'
  | 'droplets'
  | 'gauge'
  | 'info'
  | 'map-pin'
  | 'moon'
  | 'power-off'
  | 'power'
  | 'refresh-cw'
  | 'settings'
  | 'shield'
  | 'sun'
  | 'thermometer'
  | 'triangle-alert'
  | 'upload-cloud'
  | 'wifi-off'
  | 'wrench'
  | 'zap';

const MCI_MAP: Record<IconName, string> = {
  bell: 'bell-outline',
  'calendar-clock': 'calendar-clock',
  'chevron-right': 'chevron-right',
  'circle-alert': 'alert-circle-outline',
  'circle-check': 'check-circle-outline',
  droplets: 'water-outline',
  gauge: 'gauge',
  info: 'information-outline',
  'map-pin': 'map-marker',
  moon: 'weather-night',
  'power-off': 'power-off',
  power: 'power',
  'refresh-cw': 'refresh',
  settings: 'cog-outline',
  shield: 'shield-outline',
  sun: 'white-balance-sunny',
  thermometer: 'thermometer',
  'triangle-alert': 'alert-outline',
  'upload-cloud': 'cloud-upload-outline',
  'wifi-off': 'wifi-off',
  wrench: 'wrench-outline',
  zap: 'lightning-bolt',
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: any;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#000',
  style,
}) => {
  const mciName = MCI_MAP[name] ?? 'help-circle-outline';
  return <MCI name={mciName} size={size} color={color} style={style} />;
};
