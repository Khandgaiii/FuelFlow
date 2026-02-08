import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  Login: undefined;
};

export type AppTabsParamList = {
  DashboardTab: undefined;
  DiagnosticsTab: undefined;
  RemindersTab: undefined;
  SettingsTab: undefined;
};

export type RootNavigatorParamList = AuthStackParamList | AppTabsParamList;

// Auth screens
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

// App screens
export type DashboardTabScreenProps = BottomTabScreenProps<AppTabsParamList, 'DashboardTab'>;
export type DiagnosticsTabScreenProps = BottomTabScreenProps<AppTabsParamList, 'DiagnosticsTab'>;
export type RemindersTabScreenProps = BottomTabScreenProps<AppTabsParamList, 'RemindersTab'>;
export type SettingsTabScreenProps = BottomTabScreenProps<AppTabsParamList, 'SettingsTab'>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootNavigatorParamList {}
  }
}
