import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
} from 'react-native';
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
  const circumference = 2 * Math.PI * (size / 2 - 8);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.background, { width: size, height: size }]}>
        {/* Ring Background */}
        <View
          style={[
            styles.ringContainer,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <View
            style={[
              styles.ring,
              {
                width: size - 16,
                height: size - 16,
                borderRadius: (size - 16) / 2,
                borderColor: colors.border,
                borderWidth: 8,
              },
            ]}
          />
        </View>

        {/* Colored Ring - using border approach */}
        <View
          style={[
            styles.coloredRing,
            {
              width: size - 16,
              height: size - 16,
              borderRadius: (size - 16) / 2,
              borderWidth: 8,
              borderColor: ringColor,
              opacity: percentage / 100,
            },
          ]}
        />

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text
            style={[
              styles.value,
              { color: colors.text, fontSize: 28, fontWeight: 'bold' },
            ]}
          >
            {Math.round(value)}
          </Text>
          <Text style={[styles.unit, { color: colors.textSecondary, fontSize: 12 }]}>
            {unit}
          </Text>
        </View>
      </View>

      {/* Label below gauge */}
      <Text
        style={[
          styles.label,
          { color: colors.textSecondary, marginTop: 12, textAlign: 'center' },
        ]}
      >
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

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressLabel, { color: colors.text }]}>
          {label}
        </Text>
        <Text style={[styles.progressValue, { color: colors.text }]}>
          {value} {unit}
        </Text>
      </View>
      <View
        style={[
          styles.progressBarBackground,
          {
            backgroundColor: colors.border,
            height,
            borderRadius: height / 2,
          },
        ]}
      >
        <View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: barColor,
              width: `${percentage}%`,
              height,
              borderRadius: height / 2,
            },
          ]}
        />
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

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
        },
        style,
      ]}
    >
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

  return (
    <Card
      style={{
        flex: 1,
        marginHorizontal: 8,
        marginVertical: 8,
        minHeight: 140,
      }}
    >
      <View style={styles.infoCardContent}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[styles.infoCardTitle, { color: colors.textSecondary }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.infoCardValue,
            { color: colors.text, marginTop: 8 },
          ]}
        >
          {value}
          <Text style={[styles.infoCardUnit, { color: colors.textSecondary }]}>
            {' '}
            {unit}
          </Text>
        </Text>
        {/* Small progress bar */}
        <View
          style={[
            styles.tinyBar,
            {
              backgroundColor: barColor,
              height: 3,
              marginTop: 12,
            },
          ]}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coloredRing: {
    position: 'absolute',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  value: {
    fontWeight: 'bold',
  },
  unit: {
    marginTop: 4,
  },
  label: {
    fontWeight: '500',
  },
  progressContainer: {
    marginVertical: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBackground: {
    overflow: 'hidden',
  },
  progressBarFill: {
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
  },
  infoCardContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  iconContainer: {
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  infoCardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoCardUnit: {
    fontSize: 12,
    fontWeight: '400',
  },
  tinyBar: {
    borderRadius: 2,
  },
});
