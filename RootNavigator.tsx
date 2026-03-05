import React from 'react';
import {
  NavigationContainer,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Icon } from '../components/Icon';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useAuth } from '../context/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DiagnosticsScreen from '../screens/DiagnosticsScreen';
import RemindersScreen from '../screens/RemindersScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Types
import { AuthStackParamList, AppTabsParamList } from '../types/navigation';

// AppHeader Component
interface AppHeaderProps {
  vehicleName: string;
  onThemeToggle?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  vehicleName,
  onThemeToggle,
}) => {
  const { colors, toggleTheme, theme } = useTheme();
  const isDark = theme === 'dark';

  const handleThemeToggle = () => {
    toggleTheme();
    onThemeToggle?.();
  };

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.cardBackground,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerContent}>
        {/* Left: Vehicle Info */}
        <View style={styles.vehicleInfo}>
          <Text style={[styles.vehicleName, { color: colors.text }]}>
            {vehicleName}
          </Text>
          <Text
            style={[styles.connectionStatus, { color: colors.textSecondary }]}
          >
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
            {isDark ? (
              <Icon name="moon" size={14} color={colors.textSecondary} />
            ) : (
              <Icon name="sun" size={14} color={colors.warning} />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export { AppHeader };

const Stack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<AppTabsParamList>();

const AuthStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{}}
      />
    </Stack.Navigator>
  );
};

const AppTabs = () => {
  const { colors, toggleTheme } = useTheme();
  const { t } = useLocalization();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          marginBottom: 20,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          title: t('nav_dashboard'),
          tabBarIcon: ({ color }) => (
            <Icon name="gauge" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DiagnosticsTab"
        component={DiagnosticsScreen}
        options={{
          title: t('nav_diagnostics'),
          tabBarIcon: ({ color }) => (
            <Icon name="wrench" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RemindersTab"
        component={RemindersScreen}
        options={{
          title: t('nav_reminders'),
          tabBarIcon: ({ color }) => (
            <Icon name="calendar-clock" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: t('nav_settings'),
          tabBarIcon: ({ color }) => (
            <Icon name="settings" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { isLoggedIn } = useAuth();

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <AppTabs />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 16,
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
