import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CircularGaugeProps {
  value: number;
  maxValue: number;
  label: string;
  unit: string;
  ringColor: string;
  size?: number;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  maxValue,
  label,
  unit,
  ringColor,
  size = 140,
}) => {
  const { colors } = useTheme();
  const percentage = (value / maxValue) * 100;
  const containerSizeStyle = { width: size, height: size };
  const ringWrapStyle = { width: size, height: size, borderRadius: size / 2 };
  const ringStyle = {
    width: size - 16,
    height: size - 16,
    borderRadius: (size - 16) / 2,
    borderColor: colors.border,
    borderWidth: 8,
  };
  const colorRingStyle = {
    width: size - 16,
    height: size - 16,
    borderRadius: (size - 16) / 2,
    borderWidth: 8,
    borderColor: ringColor,
    opacity: percentage / 100,
  };
  const gaugeValueStyle = { color: colors.text, fontSize: 28 };
  const gaugeUnitStyle = { color: colors.textSecondary, fontSize: 12 };
  const gaugeLabelStyle = { color: colors.textSecondary };

  return (
    <View className="items-center justify-center" style={containerSizeStyle}>
      <View className="items-center justify-center" style={containerSizeStyle}>
        {/* Ring Background */}
        <View
          className="absolute items-center justify-center"
          style={ringWrapStyle}
        >
          <View className="items-center justify-center" style={ringStyle} />
        </View>

        {/* Colored Ring - using border approach */}
        <View className="absolute" style={colorRingStyle} />

        {/* Center content */}
        <View className="z-10 items-center justify-center">
          <Text className="font-bold" style={gaugeValueStyle}>
            {Math.round(value)}
          </Text>
          <Text className="mt-1" style={gaugeUnitStyle}>
            {unit}
          </Text>
        </View>
      </View>

      {/* Label below gauge */}
      <Text className="mt-3 text-center font-medium" style={gaugeLabelStyle}>
        {label}
      </Text>
    </View>
  );
};

interface ProgressBarProps {
  value: number;
  maxValue: number;
  label: string;
  unit: string;
  barColor?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  maxValue,
  label,
  unit,
  barColor = '#008B8B',
  height = 12,
}) => {
  const { colors } = useTheme();
  const percentage = (value / maxValue) * 100;
  const textStyle = { color: colors.text };
  const trackStyle = {
    backgroundColor: colors.border,
    height,
    borderRadius: height / 2,
  };
  const fillStyle = {
    backgroundColor: barColor,
    width: `${percentage}%`,
    height,
    borderRadius: height / 2,
  };

  return (
    <View className="my-3">
      <View className="mb-2 flex-row justify-between">
        <Text className="text-sm font-medium" style={textStyle}>
          {label}
        </Text>
        <Text className="text-sm font-semibold" style={textStyle}>
          {value} {unit}
        </Text>
      </View>
      <View className="overflow-hidden" style={trackStyle}>
        <View className="justify-center" style={fillStyle} />
      </View>
    </View>
  );
};

interface CardProps {
  children: React.ReactNode;
  style?: any;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const { colors } = useTheme();
  const cardBaseStyle = {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
  };

  return (
    <View className="rounded-2xl border p-4" style={[cardBaseStyle, style]}>
      {children}
    </View>
  );
};

interface InfoCardProps {
  title: string;
  value: string;
  unit: string;
  barColor?: string;
  icon?: React.ReactNode;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  value,
  unit,
  barColor = '#10B981',
  icon,
}) => {
  const { colors } = useTheme();
  const infoCardContainerStyle = {
    flex: 1,
    marginHorizontal: 8,
    marginVertical: 8,
    minHeight: 140,
  };
  const infoTitleStyle = { color: colors.textSecondary };
  const infoValueStyle = { color: colors.text };
  const infoUnitStyle = { color: colors.textSecondary };
  const tinyBarStyle = { backgroundColor: barColor, height: 3 };

  return (
    <Card style={infoCardContainerStyle}>
      <View className="flex-1 justify-start">
        {icon && <View className="mb-2">{icon}</View>}
        <Text className="text-xs font-medium uppercase" style={infoTitleStyle}>
          {title}
        </Text>
        <Text className="mt-2 text-lg font-bold" style={infoValueStyle}>
          {value}
          <Text className="text-xs font-normal" style={infoUnitStyle}>
            {' '}
            {unit}
          </Text>
        </Text>
        {/* Small progress bar */}
        <View className="mt-3 rounded-sm" style={tinyBarStyle} />
      </View>
    </Card>
  );
};
