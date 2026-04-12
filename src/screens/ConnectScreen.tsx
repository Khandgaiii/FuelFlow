import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import MCI from 'react-native-vector-icons/MaterialCommunityIcons';
import { ConnectTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useTelemetry } from '../context/TelemetryContext';
import { AppHeader } from '../navigation/RootNavigator';
import { DEVICE_NAME } from '../services/BleService';
import { alertSavedPath } from '../utils/saveJsonFile';

const ORANGE = '#F97316';

const ConnectScreen: React.FC<ConnectTabScreenProps> = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const ble = useTelemetry();

  const [exporting, setExporting] = useState<string | null>(null);

  const runDownload = useCallback(
    async (kind: 'live' | 'trip' | 'hist', key: string) => {
      if (!ble.isConnected) {
        Alert.alert(t('connect_export'), t('connect_download_need_ble'));
        return;
      }
      setExporting(key);
      try {
        const res = await ble.downloadBleJson(kind);
        if (res?.path) {
          alertSavedPath(res.path, t);
        }
      } finally {
        setExporting(null);
      }
    },
    [ble, t],
  );

  const onConnectRow = async (deviceId: string) => {
    try {
      await ble.connectToDeviceId(deviceId);
    } catch {
      /* bleError surfaced by context */
    }
  };

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[S.section, { color: colors.textSecondary, marginTop: 12 }]}>
          {t('connect_scan')}
        </Text>
        <TouchableOpacity
          style={[S.primaryBtn, { backgroundColor: ORANGE }]}
          onPress={() => ble.scanForDevices()}
          disabled={ble.isDiscovering}
        >
          {ble.isDiscovering ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={S.primaryBtnText}>{t('connect_scan_btn')}</Text>
          )}
        </TouchableOpacity>

        <Text style={[S.section, { color: colors.textSecondary }]}>
          {t('connect_devices')}
        </Text>
        <View
          style={[
            S.card,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          {ble.discoveredDevices.length === 0 ? (
            <Text style={[S.empty, { color: colors.textSecondary }]}>
              {ble.isDiscovering
                ? t('connect_scanning')
                : t('connect_no_devices')}
            </Text>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={ble.discoveredDevices}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    S.deviceRow,
                    index < ble.discoveredDevices.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => onConnectRow(item.id)}
                  disabled={ble.bleStatus === 'connecting'}
                >
                  <MCI name="bluetooth" size={20} color={ORANGE} />
                  <View style={S.deviceMeta}>
                    <Text style={[S.deviceName, { color: colors.text }]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[S.deviceSub, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.id}
                      {item.rssi != null ? ` · RSSI ${item.rssi}` : ''}
                    </Text>
                  </View>
                  <MCI name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        <Text style={[S.section, { color: colors.textSecondary }]}>
          {t('connect_status')}
        </Text>
        <View
          style={[
            S.card,
            {
              backgroundColor: colors.cardBackground,
              borderColor: ble.isConnected ? '#22C55E40' : colors.border,
            },
          ]}
        >
          <View style={S.statusRow}>
            <MCI
              name={ble.isConnected ? 'bluetooth-connect' : 'bluetooth-off'}
              size={22}
              color={ble.isConnected ? '#22C55E' : colors.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[S.statusTitle, { color: colors.text }]}>
                {ble.isConnected ? t('connect_connected') : t('connect_disconnected')}
              </Text>
              <Text style={[S.statusSub, { color: colors.textSecondary }]}>
                {ble.bleError ??
                  (ble.bleStatus === 'scanning'
                    ? t('connect_state_scanning')
                    : ble.bleStatus === 'connecting'
                      ? t('connect_state_connecting')
                      : ble.bleStatus === 'connected'
                        ? DEVICE_NAME
                        : '—')}
              </Text>
            </View>
            {ble.isConnected ? (
              <TouchableOpacity onPress={() => ble.disconnect()} style={S.discBtn}>
                <MCI name="close" size={20} color="#EF4444" />
              </TouchableOpacity>
            ) : null}
          </View>
          {ble.isConnected && ble.espTripBroadcast?.rtcTimeString ? (
            <Text style={[S.rtcLine, { color: colors.textSecondary }]}>
              {t('device_rtc_time')}: {ble.espTripBroadcast.rtcTimeString}
            </Text>
          ) : null}
        </View>

        <Text style={[S.section, { color: colors.textSecondary }]}>
          {t('connect_export_section')}
        </Text>
        <View
          style={[
            S.card,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
        >
          <ExportRow
            icon="gauge"
            label={t('connect_download_live')}
            onPress={() => runDownload('live', 'live')}
            loading={exporting === 'live'}
            colors={colors}
          />
          <ExportRow
            icon="map-marker-path"
            label={t('connect_download_trip')}
            onPress={() => runDownload('trip', 'trip')}
            loading={exporting === 'trip'}
            colors={colors}
          />
          <ExportRow
            icon="history"
            label={t('connect_download_hist')}
            onPress={() => runDownload('hist', 'hist')}
            loading={exporting === 'hist'}
            colors={colors}
            isLast
          />
        </View>

        <Text style={[S.hint, { color: colors.textSecondary }]}>
          {t('connect_files_hint')}
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const ExportRow: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
  loading: boolean;
  colors: any;
  isLast?: boolean;
}> = ({ icon, label, onPress, loading, colors, isLast }) => (
  <TouchableOpacity
    style={[
      S.exportRow,
      !isLast && {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      },
    ]}
    onPress={onPress}
    disabled={loading}
  >
    <MCI name={icon} size={20} color={ORANGE} />
    <Text style={[S.exportLabel, { color: colors.text }]}>{label}</Text>
    {loading ? (
      <ActivityIndicator size="small" color={ORANGE} />
    ) : (
      <MCI name="download" size={18} color={colors.textSecondary} />
    )}
  </TouchableOpacity>
);

const S = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  section: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  empty: { padding: 20, textAlign: 'center', fontSize: 13 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  deviceMeta: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: '600' },
  deviceSub: { fontSize: 11, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  statusTitle: { fontSize: 16, fontWeight: '700' },
  statusSub: { fontSize: 12, marginTop: 4 },
  rtcLine: { fontSize: 11, marginTop: 10, paddingHorizontal: 4, lineHeight: 16 },
  discBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  exportLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 11, marginTop: 10, marginLeft: 4, lineHeight: 16 },
});

export default ConnectScreen;
