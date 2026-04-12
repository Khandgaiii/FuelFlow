import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface RadialGaugeProps {
  /** Pass `null` when ESP is not connected — shows em dash, empty ring */
  value: number | null;
  maxValue: number;
  label: string;
  unit: string;
  ringColor: string;
  size?: 'sm' | 'md' | 'lg';
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export const RadialGauge: React.FC<RadialGaugeProps> = ({
  value,
  maxValue,
  label,
  unit,
  ringColor,
  size = 'sm',
}) => {
  const { colors } = useTheme();
  const dim = size === 'lg' ? 160 : size === 'md' ? 130 : 110;
  const strokeWidth = 8;
  const cx = dim / 2;
  const cy = dim / 2;
  const radius = (dim - strokeWidth * 2) / 2;

  const START_ANGLE = 135;
  const END_ANGLE = 405;
  const SWEEP = END_ANGLE - START_ANGLE;

  const isEmpty = value === null || value === undefined;
  const numValue = isEmpty ? 0 : value;
  const clampedValue = Math.min(Math.max(numValue, 0), maxValue);
  const progress = clampedValue / maxValue;
  const fillEndAngle = START_ANGLE + SWEEP * progress;

  const trackPath = describeArc(cx, cy, radius, START_ANGLE, END_ANGLE);
  const fillPath =
    !isEmpty && progress > 0
      ? describeArc(
          cx,
          cy,
          radius,
          START_ANGLE,
          Math.max(fillEndAngle, START_ANGLE + 0.5),
        )
      : null;

  const displayValue =
    unit === 'x1000'
      ? (numValue / 1000).toFixed(1)
      : String(Math.round(numValue));
  const displayUnit = unit === 'x1000' ? 'RPM' : unit;

  const noData = isEmpty;
  const dimTrack = colors.border;
  const gradientId = `grad-${label.replace(/\s/g, '')}`;

  return (
    <View style={S.wrap}>
      <Svg width={dim} height={dim}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={ringColor} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={ringColor} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <Path
          d={trackPath}
          stroke={dimTrack}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />

        {fillPath && !noData && (
          <Path
            d={fillPath}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        )}

        <Circle
          cx={cx}
          cy={cy}
          r={3}
          fill={noData ? dimTrack : ringColor}
          opacity={noData ? 1 : 0.6}
        />
      </Svg>

      <View style={[S.center, { width: dim, height: dim }]}>
        <Text
          style={[
            S.value,
            {
              fontSize: size === 'lg' ? 28 : 22,
              color: noData ? colors.textSecondary : colors.text,
            },
          ]}
        >
          {noData ? '—' : displayValue}
        </Text>
        <Text style={[S.unit, { color: colors.textSecondary }]}>
          {displayUnit}
        </Text>
      </View>

      <Text style={[S.label, { color: colors.textSecondary }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
};

const S = StyleSheet.create({
  wrap: { alignItems: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'Courier New',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    opacity: 0.5,
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    opacity: 0.45,
  },
});
