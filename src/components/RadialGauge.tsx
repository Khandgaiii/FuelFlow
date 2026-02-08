import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';

interface RadialGaugeProps {
  value: number;
  maxValue: number;
  label: string;
  unit: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'lime';
  ringColor?: string;
}

export const RadialGauge: React.FC<RadialGaugeProps> = ({
  value,
  maxValue,
  label,
  unit,
  size = 'lg',
  color = 'cyan',
  ringColor = '#00D4FF',
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(Math.round(value));
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const sizeConfig = {
    sm: { width: 112, height: 112, radius: 50, fontSize: 24 },
    md: { width: 144, height: 144, radius: 65, fontSize: 28 },
    lg: { width: 180, height: 180, radius: 80, fontSize: 36 },
  };

  const config = sizeConfig[size];
  const percentage = (displayValue / maxValue) * 100;
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75;
  const strokeWidth = size === 'lg' ? 12 : size === 'md' ? 10 : 8;

  // Generate tick marks
  const tickMarks = Array.from({ length: 9 }, (_, i) => {
    const angle = -135 + i * 33.75;
    return { angle, value: Math.round((i / 8) * maxValue) };
  });

  return (
    <View style={styles.container}>
      <View style={{ width: config.width, height: config.height, position: 'relative' }}>
        <Svg width={config.width} height={config.height} viewBox={`0 0 ${config.width} ${config.height}`}>
          {/* Background arc */}
          <Circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={config.radius}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={strokeWidth}
            strokeOpacity={0.15}
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            rotation={-135}
            originX={config.width / 2}
            originY={config.height / 2}
          />

          {/* Active arc */}
          <Circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={config.radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={strokeDashoffset}
            rotation={-135}
            originX={config.width / 2}
            originY={config.height / 2}
          />

          {/* Tick marks */}
          {tickMarks.map((tick, i) => {
            const angle = (tick.angle * Math.PI) / 180;
            const x1 = config.width / 2;
            const y1 = config.height / 2;
            const x2 = config.width / 2 + (config.radius - 12) * Math.cos(angle);
            const y2 = config.height / 2 + (config.radius - 12) * Math.sin(angle);
            
            // Calculate rotated tick mark endpoints
            const centerX = config.width / 2;
            const centerY = config.height / 2;
            const baseX = centerX;
            const baseY = centerY - config.radius + 8;
            const tickLength = 4;
            
            // Rotate tick mark around center
            const angleRad = (tick.angle + 135) * (Math.PI / 180);
            const relativeX = baseX - centerX;
            const relativeY = baseY - (centerY - config.radius + 8);
            
            const rotatedX1 = centerX + relativeX * Math.cos(angleRad) - relativeY * Math.sin(angleRad);
            const rotatedY1 = centerY + relativeX * Math.sin(angleRad) + relativeY * Math.cos(angleRad);
            
            const endX = centerX + (relativeX - tickLength) * Math.cos(angleRad);
            const endY = centerY + (relativeX - tickLength) * Math.sin(angleRad);
            
            return (
              <Line
                key={i}
                x1={rotatedX1}
                y1={rotatedY1}
                x2={endX}
                y2={endY}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
              />
            );
          })}
        </Svg>

        {/* Center display */}
        <View style={styles.centerDisplay}>
          <Text style={[styles.gaugeValue, { fontSize: config.fontSize, color: ringColor }]}>
            {displayValue}
          </Text>
          <Text style={[styles.gaugeUnit, { color: ringColor }]}>{unit}</Text>
          <Text style={styles.gaugeLabel}>{label}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDisplay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: {
    fontWeight: 'bold',
    fontFamily: 'Courier New',
  },
  gaugeUnit: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  gaugeLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#999',
    marginTop: 2,
  },
});
