import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Share,
  Alert,
  Platform,
} from 'react-native';
import MCI from 'react-native-vector-icons/MaterialCommunityIcons';
import { getApp } from '@react-native-firebase/app';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { ConnectTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useAuth } from '../context/AuthContext';
import { useTelemetry } from '../context/TelemetryContext';
import { AppHeader } from '../navigation/RootNavigator';
import { DEVICE_NAME } from '../services/BleService';

const ORANGE = '#F97316';

const ConnectScreen: React.FC<ConnectTabScreenProps> = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();
  const db = getFirestore(getApp());
  const ble = useTelemetry();

  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ble.discoveredDevices;
    return ble.discoveredDevices.filter(
      d =>
        d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q),
    );
  }, [ble.discoveredDevices, search]);

  const shareJson = useCallback(
    async (label: string, payload: object) => {
      const body = JSON.stringify(payload, null, 2);
      try {
        await Share.share({
          title: `FuelFlow — ${label}`,
          message: body,
        });
      } catch (e) {
        Alert.alert(t('connect_export'), String(e));
      }
    },
    [t],
  );

  const exportTelemetryJson = useCallback(async () => {
    setExporting('tel');
    try {
      await shareJson('telemetry', {
        exportedAt: new Date().toISOString(),
        source: ble.isConnected ? 'ble_live' : 'last_known',
        telemetry: ble.telemetry,
      });
    } finally {
      setExporting(null);
    }
  }, [ble.isConnected, ble.telemetry, shareJson]);

  const exportDiagnosticsJson = useCallback(async () => {
    if (!user?.uid) return;
    setExporting('diag');
    try {
      const ref = doc(db, 'users', user.uid, 'diagnostics', 'latest');
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      await shareJson('diagnostics', {
        exportedAt: new Date().toISOString(),
        diagnostics: data,
      });
    } catch (e) {
      Alert.alert(t('connect_export'), String(e));
    } finally {
      setExporting(null);
    }
  }, [db, shareJson, user?.uid]);

  const exportCombinedJson = useCallback(async () => {
    if (!user?.uid) return;
    setExporting('all');
    try {
      const ref = doc(db, 'users', user.uid, 'diagnostics', 'latest');
      const snap = await getDoc(ref);
      const diag = snap.exists() ? snap.data() : {};
      await shareJson('combined', {
        exportedAt: new Date().toISOString(),
        bleConnected: ble.isConnected,
        telemetry: ble.telemetry,
        diagnostics: diag,
      });
    } catch (e) {
      Alert.alert(t('connect_export'), String(e));
    } finally {
      setExporting(null);
    }
  }, [db, ble.isConnected, ble.telemetry, shareJson, user?.uid]);

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
        <Text style={[S.section, { color: colors.textSecondary }]}>
          {t('connect_search')}
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('connect_search_ph')}
          placeholderTextColor={colors.textSecondary}
          style={[
            S.input,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />

        <Text style={[S.section, { color: colors.textSecondary }]}>
          {t('connect_scan')}
        </Text>
        <View style={S.rowBtns}>
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
          <TouchableOpacity
            style={[
              S.secondaryBtn,
              { borderColor: colors.border, backgroundColor: colors.cardBackground },
            ]}
            onPress={() => ble.connect()}
            disabled={
              ble.bleStatus === 'scanning' ||
              ble.bleStatus === 'connecting' ||
              ble.isConnected
            }
          >
            <Text style={[S.secondaryBtnText, { color: colors.text }]}>
              {t('connect_quick')} ({DEVICE_NAME})
            </Text>
          </TouchableOpacity>
        </View>

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
          {filtered.length === 0 ? (
            <Text style={[S.empty, { color: colors.textSecondary }]}>
              {ble.isDiscovering
                ? t('connect_scanning')
                : t('connect_no_devices')}
            </Text>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={filtered}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    S.deviceRow,
                    index < filtered.length - 1 && {
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
            label={t('connect_export_telemetry')}
            onPress={exportTelemetryJson}
            loading={exporting === 'tel'}
            colors={colors}
          />
          <ExportRow
            icon="car-wrench"
            label={t('connect_export_diagnostics')}
            onPress={exportDiagnosticsJson}
            loading={exporting === 'diag'}
            colors={colors}
          />
          <ExportRow
            icon="file-download-outline"
            label={t('connect_export_combined')}
            onPress={exportCombinedJson}
            loading={exporting === 'all'}
            colors={colors}
            isLast
          />
        </View>

        {Platform.OS === 'android' ? (
          <Text style={[S.hint, { color: colors.textSecondary }]}>
            {t('connect_share_hint')}
          </Text>
        ) : null}

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
      <MCI name="share-variant" size={18} color={colors.textSecondary} />
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
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
  },
  rowBtns: { gap: 10 },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { fontWeight: '600', fontSize: 13 },
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
