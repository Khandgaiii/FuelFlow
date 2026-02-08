/**
 * FuelFlow - Car Dashboard Application
 * React Native CLI with React Navigation
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Providers
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LocalizationProvider } from './src/context/LocalizationContext';
import { AuthProvider } from './src/context/AuthContext';
import { MetricUnitsProvider } from './src/context/MetricUnitsContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppContent() {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      <RootNavigator />
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LocalizationProvider>
            <AuthProvider>
              <MetricUnitsProvider>
                <AppContent />
              </MetricUnitsProvider>
            </AuthProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
