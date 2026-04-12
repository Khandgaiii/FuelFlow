import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import { Icon } from '../components/Icon';
import { DiagnosticsTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useAuth } from '../context/AuthContext';
import { useTelemetry } from '../context/TelemetryContext';
import { AppHeader } from '../navigation/RootNavigator';

// --- Types ---
interface FaultCode {
  id: string;
  code: string;
  description: string;
  severity: 'critical' | 'warning';
  detectedAt: string;
}

interface DiagnosticsData {
  faultCodes: FaultCode[];
  protocol: string;
  protocolSpeed: string;
}

const EMPTY_DIAGNOSTICS: DiagnosticsData = {
  faultCodes: [],
  protocol: 'OBD-II',
  protocolSpeed: '—',
};

const DiagnosticsScreen: React.FC<DiagnosticsTabScreenProps> = ({
  navigation: _navigation,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();
  const ble = useTelemetry();
  const db = getFirestore(getApp());

  const [data, setData] = useState<DiagnosticsData>(EMPTY_DIAGNOSTICS);
  const [isFetching, setIsFetching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasPermissionError, setHasPermissionError] = useState(false);

  // --- Firestore: users/{uid}/diagnostics/latest ---
  const fetchDiagnostics = useCallback(async () => {
    if (!user?.uid) return;
    setIsFetching(true);
    try {
      const docRef = doc(db, 'users', user.uid, 'diagnostics', 'latest');

      const docSnap = await getDoc(docRef);

      const snapData = docSnap.data();
      if (snapData) {
        setData({ ...EMPTY_DIAGNOSTICS, ...snapData } as DiagnosticsData);
      } else {
        // First time — initialize with empty data
        console.log(
          `[FuelFlow] No diagnostics for UID ${user.uid} — initializing...`,
        );
        await setDoc(docRef, {
          ...EMPTY_DIAGNOSTICS,
          lastUpdated: serverTimestamp(),
        });
        setData(EMPTY_DIAGNOSTICS);
      }
      setHasPermissionError(false);
    } catch (error: any) {
      if (error?.code === 'firestore/permission-denied') {
        setHasPermissionError(true);
        setData(EMPTY_DIAGNOSTICS);
        return;
      }
      console.error('[FuelFlow] Diagnostics fetch error:', error);
    } finally {
      setIsFetching(false);
      setIsInitialLoad(false);
    }
  }, [db, user?.uid]);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  const criticalCount = data.faultCodes.filter(
    f => f.severity === 'critical',
  ).length;
  const warningCount = data.faultCodes.filter(
    f => f.severity === 'warning',
  ).length;
  const totalFaults = data.faultCodes.length;

  const [faultQuery, setFaultQuery] = useState('');

  const filteredFaults = useMemo(() => {
    const q = faultQuery.trim().toLowerCase();
    if (!q) return data.faultCodes;
    return data.faultCodes.filter(
      f =>
        f.code.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q),
    );
  }, [data.faultCodes, faultQuery]);

  const exportDiagnosticsJson = useCallback(async () => {
    try {
      await Share.share({
        title: 'FuelFlow Diagnostics',
        message: JSON.stringify(
          { exportedAt: new Date().toISOString(), ...data },
          null,
          2,
        ),
      });
    } catch (e) {
      Alert.alert(t('export_json'), String(e));
    }
  }, [data, t]);

  const clearStoredFaults = useCallback(() => {
    if (!user?.uid) return;
    Alert.alert(t('clear_faults'), t('clear_faults_confirm'), [
      { text: t('close'), style: 'cancel' },
      {
        text: t('clear_faults'),
        style: 'destructive',
        onPress: async () => {
          try {
            const docRef = doc(db, 'users', user.uid, 'diagnostics', 'latest');
            await setDoc(docRef, {
              ...EMPTY_DIAGNOSTICS,
              lastUpdated: serverTimestamp(),
            });
            setData(EMPTY_DIAGNOSTICS);
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  }, [db, user?.uid, t]);

  const getSeverityColor = (severity: string) =>
    severity === 'critical' ? colors.danger : colors.warning;

  const getSeverityBg = (severity: string) =>
    severity === 'critical' ? `${colors.danger}20` : `${colors.warning}20`;
  const bottomSpacerStyle = styles.bottomSpacer;

  if (isInitialLoad) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('loading_diagnostics')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <AppHeader />
      <ScrollView
        className="flex-1"
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section header ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              {t('fault_codes')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.refreshBtn, { borderColor: colors.border }]}
              onPress={exportDiagnosticsJson}
            >
              <Icon name="share" size={15} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.refreshBtn, { borderColor: colors.border }]}
              onPress={fetchDiagnostics}
              disabled={isFetching}
            >
              {isFetching ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Icon name="refresh-cw" size={15} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {ble.isConnected ? (
          <TextInput
            value={faultQuery}
            onChangeText={setFaultQuery}
            placeholder={t('search_faults')}
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
        ) : null}

        {!ble.isConnected ? (
          <View
            style={[
              styles.bleBanner,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon name="wifi-off" size={28} color={colors.warning} />
            <Text style={[styles.bleBannerTitle, { color: colors.text }]}>
              {t('diagnostics_not_connected')}
            </Text>
            <Text style={[styles.bleBannerSub, { color: colors.textSecondary }]}>
              {t('diagnostics_connect_hint')}
            </Text>
          </View>
        ) : null}

        {ble.isConnected &&
        totalFaults > 0 &&
        !hasPermissionError && (
          <TouchableOpacity
            style={[styles.clearBtn, { borderColor: colors.danger }]}
            onPress={clearStoredFaults}
          >
            <Text style={[styles.clearBtnText, { color: colors.danger }]}>
              {t('clear_faults')}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Stats Row ── */}
        {ble.isConnected ? (
        <View className="flex-row" style={styles.statsRow}>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: `${colors.danger}10`,
                borderColor: `${colors.danger}20`,
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: colors.danger }]}>
              {criticalCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.danger }]}>
              {t('critical_label')}
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: `${colors.warning}10`,
                borderColor: `${colors.warning}20`,
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: colors.warning }]}>
              {warningCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.warning }]}>
              {t('warning_label')}
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: `${colors.success}10`,
                borderColor: `${colors.success}20`,
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {totalFaults === 0 ? 'OK' : totalFaults}
            </Text>
            <Text style={[styles.statLabel, { color: colors.success }]}>
              {totalFaults === 0 ? t('status_label') : t('total_label')}
            </Text>
          </View>
        </View>
        ) : null}

        {/* ── Fault List ── */}
        <View className="px-4" style={styles.faultSection}>
          {hasPermissionError ? (
            <View
              style={[
                styles.noFaultsCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Icon name="circle-alert" size={40} color={colors.warning} />
              <Text style={[styles.noFaultsTitle, { color: colors.text }]}>
                {t('permission_needed')}
              </Text>
              <Text
                style={[styles.noFaultsText, { color: colors.textSecondary }]}
              >
                {t('permission_check_rules')}
              </Text>
            </View>
          ) : !ble.isConnected ? null : totalFaults === 0 ? (
            <View
              style={[
                styles.noFaultsCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Icon name="circle-check" size={40} color={colors.success} />
              <Text style={[styles.noFaultsTitle, { color: colors.text }]}>
                {t('all_systems_normal')}
              </Text>
              <Text
                style={[styles.noFaultsText, { color: colors.textSecondary }]}
              >
                {t('no_active_faults')}
              </Text>
            </View>
          ) : filteredFaults.length === 0 ? (
            <View
              style={[
                styles.noFaultsCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Icon name="info" size={36} color={colors.textSecondary} />
              <Text style={[styles.noFaultsTitle, { color: colors.text }]}>
                {t('search_faults')}
              </Text>
              <Text
                style={[styles.noFaultsText, { color: colors.textSecondary }]}
              >
                {t('fault_search_empty')}
              </Text>
            </View>
          ) : (
            filteredFaults.map(fault => (
              <View
                key={fault.id}
                style={[
                  styles.faultCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.faultTopBar,
                    { backgroundColor: getSeverityColor(fault.severity) },
                  ]}
                />
                <View style={styles.faultContent}>
                  <View
                    style={[
                      styles.faultIconBox,
                      {
                        backgroundColor: getSeverityBg(fault.severity),
                        borderColor: getSeverityColor(fault.severity),
                      },
                    ]}
                  >
                    <Icon
                      name={
                        fault.severity === 'critical'
                          ? 'circle-alert'
                          : 'triangle-alert'
                      }
                      size={18}
                      color={getSeverityColor(fault.severity)}
                    />
                  </View>
                  <View style={styles.faultInfo}>
                    <View style={styles.faultCodeRow}>
                      <Text style={[styles.faultCode, { color: colors.text }]}>
                        {fault.code}
                      </Text>
                      <View
                        style={[
                          styles.severityBadge,
                          { backgroundColor: getSeverityBg(fault.severity) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: getSeverityColor(fault.severity) },
                          ]}
                        >
                          {fault.severity.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.faultDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {fault.description}
                    </Text>
                    <Text
                      style={[
                        styles.faultTimestamp,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {fault.detectedAt}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Protocol Info ── */}
        {ble.isConnected ? (
        <View
          style={[
            styles.protocolCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.protocolLabel, { color: colors.textSecondary }]}>
            {t('obd_protocol')}
          </Text>
          <Text style={[styles.protocolValue, { color: colors.text }]}>
            {data.protocolSpeed !== '—' ? `CAN ${data.protocolSpeed}` : '—'}
          </Text>
        </View>
        ) : null}

        {/* ── BLE Status ── */}
        <View
          style={[
            styles.protocolCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: ble.isConnected ? '#22C55E40' : colors.border,
              marginTop: 8,
            },
          ]}
        >
          <Text style={[styles.protocolLabel, { color: colors.textSecondary }]}>
            BLE
          </Text>
          <Text
            style={[
              styles.protocolValue,
              { color: ble.isConnected ? '#22C55E' : colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {ble.isConnected
              ? '● FuelFlow-ESP32 · live'
              : ble.bleStatus === 'scanning'
                ? '…'
                : ble.bleStatus === 'connecting'
                  ? 'connecting…'
                  : ble.bleError ?? '—'}
          </Text>
        </View>

        <View style={bottomSpacerStyle} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: { fontSize: 13, fontWeight: '500' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
  },
  clearBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearBtnText: { fontSize: 13, fontWeight: '700' },
  bleBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  bleBannerTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  bleBannerSub: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statNumber: { fontSize: 22, fontWeight: '800', fontFamily: 'Courier New' },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  faultSection: { paddingHorizontal: 16, marginBottom: 16 },

  noFaultsCard: {
    paddingVertical: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  noFaultsTitle: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  noFaultsText: { fontSize: 12 },

  faultCard: {
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faultTopBar: { height: 3, width: '100%' },
  faultContent: { padding: 14, flexDirection: 'row', gap: 12 },
  faultIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faultInfo: { flex: 1 },
  faultCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  faultCode: { fontSize: 14, fontWeight: '700', fontFamily: 'Courier New' },
  severityBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  faultDescription: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  faultTimestamp: { fontSize: 10, fontFamily: 'Courier New', opacity: 0.6 },

  protocolCard: {
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  protocolLabel: { fontSize: 12, fontWeight: '500' },
  protocolValue: { fontSize: 11, fontFamily: 'Courier New', fontWeight: '600' },
  bottomSpacer: { height: 48 },
});

export default DiagnosticsScreen;
