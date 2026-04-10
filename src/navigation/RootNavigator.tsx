import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MCI from 'react-native-vector-icons/MaterialCommunityIcons';
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

// ─── AppHeader ────────────────────────────────────────────────────────────────
const AppHeader: React.FC = () => {
  const { colors, toggleTheme, theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <View
      style={[
        S.header,
        {
          backgroundColor: colors.cardBackground,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Left: Wordmark */}
      <View style={S.headerLeft}>
        <Text style={S.wordmark}>
          <Text style={{ color: '#F97316' }}>Fuel</Text>
          <Text style={{ color: colors.text }}>Flow</Text>
        </Text>
      </View>

      {/* Right: Theme Toggle */}
      <TouchableOpacity
        onPress={toggleTheme}
        style={[
          S.themeToggle,
          { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
        ]}
        activeOpacity={0.7}
      >
        <View
          style={[
            S.thumb,
            {
              backgroundColor: colors.cardBackground,
              transform: [{ translateX: isDark ? 26 : 2 }],
            },
          ]}
        >
          <MCI
            name={isDark ? 'weather-night' : 'white-balance-sunny'}
            size={14}
            color={isDark ? '#A78BFA' : '#F59E0B'}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export { AppHeader };

// ─── Navigators ──────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<AppTabsParamList>();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

type TabIconProps = { color: string; focused: boolean; size: number };

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  DashboardTab: { active: 'gauge', inactive: 'gauge' },
  DiagnosticsTab: { active: 'wrench', inactive: 'wrench-outline' },
  RemindersTab: { active: 'bell', inactive: 'bell-outline' },
  SettingsTab: { active: 'cog', inactive: 'cog-outline' },
};

const AppTabs = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, focused }: TabIconProps) => {
          const map = TAB_ICONS[route.name];
          const iconName = focused ? map?.active : map?.inactive;
          return (
            <MCI
              name={iconName ?? 'circle-outline'}
              size={22}
              color={color}
            />
          );
        },
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 56 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 1,
        },
        tabBarItemStyle: { paddingTop: 2 },
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{ title: t('nav_dashboard') }}
      />
      <Tab.Screen
        name="DiagnosticsTab"
        component={DiagnosticsScreen}
        options={{ title: t('nav_diagnostics') }}
      />
      <Tab.Screen
        name="RemindersTab"
        component={RemindersScreen}
        options={{ title: t('nav_reminders') }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: t('nav_settings') }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const { isLoggedIn } = useAuth();

  return (
    <NavigationContainer>
      {isLoggedIn ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {},
  wordmark: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },

  // Theme toggle — pill with sliding thumb
  themeToggle: {
    width: 54,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
