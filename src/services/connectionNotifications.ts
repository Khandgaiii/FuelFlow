import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';

const CHANNEL_ID = 'fuelflow-connection';

export async function initConnectionNotifications(): Promise<void> {
  await notifee.requestPermission();
  if (Platform.OS === 'android') {
    if (Number(Platform.Version) >= 33) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    }
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Vehicle connection',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
}

export async function notifyDeviceConnected(): Promise<void> {
  await notifee.displayNotification({
    title: 'FuelFlow',
    body: 'ESP32 is connected — live telemetry active.',
    ios: { sound: 'default' },
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
      pressAction: { id: 'default' },
    },
  });
}

export async function notifyDeviceDisconnected(): Promise<void> {
  await notifee.displayNotification({
    title: 'FuelFlow',
    body: 'ESP32 disconnected — open Connect to pair again.',
    ios: { sound: 'default' },
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
      pressAction: { id: 'default' },
    },
  });
}
