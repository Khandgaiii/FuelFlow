import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface RadialGaugeProps {
  value: number;
  maxValue: number;
  label: string;
  unit: string;
  ringColor: string;
  size?: 'sm' | 'md' | 'lg';
}

// Build an SVG arc path from polar coordinates
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
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
  const dim = size === 'lg' ? 160 : size === 'md' ? 130 : 110;
  const strokeWidth = 8;
  const cx = dim / 2;
  const cy = dim / 2;
  const radius = (dim - strokeWidth * 2) / 2;

  // Arc goes from 135° to 405° (270° sweep) — bottom-left to bottom-right
  const START_ANGLE = 135;
  const END_ANGLE = 405;
  const SWEEP = END_ANGLE - START_ANGLE; // 270

  const clampedValue = Math.min(Math.max(value, 0), maxValue);
  const progress = clampedValue / maxValue;
  const fillEndAngle = START_ANGLE + SWEEP * progress;

  const trackPath = describeArc(cx, cy, radius, START_ANGLE, END_ANGLE);
  const fillPath =
    progress > 0
      ? describeArc(cx, cy, radius, START_ANGLE, Math.max(fillEndAngle, START_ANGLE + 0.5))
      : null;

  // Display value - for rpm divide by 1000
  const displayValue =
    unit === 'x1000' ? (value / 1000).toFixed(1) : String(value);
  const displayUnit = unit === 'x1000' ? 'RPM' : unit;

  const noData = value === 0;
  const dimColor = 'rgba(255,255,255,0.07)';
  const gradientId = `grad-${label.replace(/\s/g, '')}`;

  return (
    <View style={styles.wrapper}>
      <Svg width={dim} height={dim}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={ringColor} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={ringColor} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Track (background arc) */}
        <Path
          d={trackPath}
          stroke={dimColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />

        {/* Fill arc */}
        {fillPath && !noData && (
          <Path
            d={fillPath}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Center dot */}
        <Circle
          cx={cx}
          cy={cy}
          r={3}
          fill={noData ? dimColor : ringColor}
          opacity={noData ? 1 : 0.6}
        />
      </Svg>

      {/* Center text overlay */}
      <View style={[styles.centerText, { width: dim, height: dim }]}>
        <Text
          style={[
            styles.valueText,
            { color: noData ? 'rgba(255,255,255,0.2)' : '#FFFFFF' },
            size === 'lg' && { fontSize: 28 },
          ]}
        >
          {noData ? '—' : displayValue}
        </Text>
        <Text style={styles.unitText}>{displayUnit}</Text>
      </View>

      {/* Label below */}
      <Text style={styles.labelText}>{label.toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  centerText: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  valueText: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Courier New',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  unitText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.8,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.2,
    marginTop: 4,
  },
});