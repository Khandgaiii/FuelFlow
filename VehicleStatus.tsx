import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusItem {
  icon: string | React.ReactNode;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
  color: string;
}

interface VehicleStatusProps {
  items: StatusItem[];
  colors: {
    cardBackground: string;
    border: string;
    textSecondary: string;
    text: string;
    success: string;
    warning: string;
    danger: string;
  };
}

export const VehicleStatus: React.FC<VehicleStatusProps> = ({ items, colors }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'critical':
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const getBackgroundColor = (status: string, color: string) => {
    if (status === 'good') return colors.success;
    if (status === 'warning') return colors.warning;
    if (status === 'critical') return colors.danger;
    return color;
  };

  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <View
          key={index}
          style={[
            styles.statusCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: item.status === 'good' 
                ? colors.border 
                : item.status === 'warning' 
                ? `${colors.warning}40`
                : `${colors.danger}40`,
              borderWidth: 1,
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: item.status === 'good'
                  ? `${colors.success}15`
                  : item.status === 'warning'
                  ? `${colors.warning}15`
                  : `${colors.danger}15`,
              },
            ]}
          >
            {typeof item.icon === 'string' ? (
              <Text style={styles.icon}>{item.icon}</Text>
            ) : (
              item.icon
            )}
          </View>

          {/* Label and Value */}
          <View style={styles.content}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
            <Text
              style={[
                styles.value,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusCard: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  value: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
  },
});
