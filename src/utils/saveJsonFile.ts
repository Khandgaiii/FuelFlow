import { Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';

/**
 * Writes JSON to app-accessible storage (Android: app external files/FuelFlow;
 * iOS: Documents/FuelFlow). No system share sheet.
 */
export async function saveFuelFlowJsonFile(
  basename: string,
  content: string,
): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeBase = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `fuelflow-${safeBase}-${stamp}.json`;
  const root =
    Platform.OS === 'android'
      ? RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath
      : RNFS.DocumentDirectoryPath;
  const dir = `${root}/FuelFlow`;
  const exists = await RNFS.exists(dir);
  if (!exists) {
    await RNFS.mkdir(dir);
  }
  const path = `${dir}/${fileName}`;
  await RNFS.writeFile(path, content, 'utf8');
  return path;
}

export function alertSavedPath(path: string, t: (k: string) => string) {
  Alert.alert(t('connect_download_ok'), `${path}`, [{ text: t('close') }]);
}
