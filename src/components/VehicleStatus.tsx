import React from 'react';
import { View, Text } from 'react-native';

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

export const VehicleStatus: React.FC<VehicleStatusProps> = ({
  items,
  colors,
}) => {
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

  return (
    <View className="flex-row flex-wrap gap-2.5">
      {items.map((item, index) =>
        (() => {
          const statusCardStyle = {
            backgroundColor: colors.cardBackground,
            borderColor:
              item.status === 'good'
                ? colors.border
                : item.status === 'warning'
                ? `${colors.warning}40`
                : `${colors.danger}40`,
          };
          const iconWrapStyle = {
            backgroundColor:
              item.status === 'good'
                ? `${colors.success}15`
                : item.status === 'warning'
                ? `${colors.warning}15`
                : `${colors.danger}15`,
          };
          const labelStyle = { color: colors.textSecondary };
          const valueStyle = {
            color: getStatusColor(item.status),
            fontFamily: 'Courier New' as const,
          };
          return (
            <View
              key={index}
              className="min-w-[48%] flex-1 flex-row items-center gap-2.5 rounded-xl border px-3 py-3"
              style={statusCardStyle}
            >
              {/* Icon */}
              <View
                className="h-9 w-9 items-center justify-center rounded-lg"
                style={iconWrapStyle}
              >
                {typeof item.icon === 'string' ? (
                  <Text className="text-lg">{item.icon}</Text>
                ) : (
                  item.icon
                )}
              </View>

              {/* Label and Value */}
              <View className="flex-1">
                <Text
                  className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.3px]"
                  style={labelStyle}
                >
                  {item.label}
                </Text>
                <Text className="text-[13px] font-bold" style={valueStyle}>
                  {item.value}
                </Text>
              </View>
            </View>
          );
        })(),
      )}
    </View>
  );
};
