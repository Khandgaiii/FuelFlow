import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AppHeaderProps {
  vehicleName: string;
  onThemeToggle?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ vehicleName, onThemeToggle }) => {
  const { colors, toggleTheme, theme } = useTheme();
  const isDark = theme === 'dark';

  const handleThemeToggle = () => {
    toggleTheme();
    onThemeToggle?.();
  };

  return (
    <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
      <View style={styles.headerContent}>
        {/* Left: Vehicle Info */}
        <View style={styles.vehicleInfo}>
          <Text style={[styles.vehicleName, { color: colors.text }]}>
            {vehicleName}
          </Text>
          <Text style={[styles.connectionStatus, { color: colors.textSecondary }]}>
            ● Connected
          </Text>
        </View>

        {/* Right: Theme Toggle Button */}
        <TouchableOpacity
          onPress={handleThemeToggle}
          style={[
            styles.themeToggle,
            {
              backgroundColor: colors.border,
            },
          ]}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.toggleThumb,
              {
                backgroundColor: colors.cardBackground,
                transform: [{ translateX: isDark ? 20 : 0 }],
              },
            ]}
          >
            <Text style={styles.themeIcon}>
              {isDark ? '🌙' : '☀️'}
            </Text>
          </View>
          <Text style={[styles.themeIconLeft, { opacity: isDark ? 0.3 : 0 }]}>
            ☀️
          </Text>
          <Text style={[styles.themeIconRight, { opacity: isDark ? 0 : 0.3 }]}>
            🌙
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  connectionStatus: {
    fontSize: 10,
    fontFamily: 'Courier New',
    fontWeight: '500',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 56,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 4,
    position: 'relative',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  themeIcon: {
    fontSize: 14,
  },
  themeIconLeft: {
    position: 'absolute',
    left: 6,
    fontSize: 12,
  },
  themeIconRight: {
    position: 'absolute',
    right: 6,
    fontSize: 12,
  },
});
