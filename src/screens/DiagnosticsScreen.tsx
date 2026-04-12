import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Icon } from '../components/Icon';
import { DiagnosticsTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useTelemetry } from '../context/TelemetryContext';
import { AppHeader } from '../navigation/RootNavigator';
import { EspFaultCodeRow } from '../services/BleService';
import {
  saveFuelFlowJsonFile,
  alertSavedPath,
} from '../utils/saveJsonFile';

const DiagnosticsScreen: React.FC<DiagnosticsTabScreenProps> = ({
  navigation: _navigation,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const ble = useTelemetry();

  const [faultQuery, setFaultQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const faultCodes: EspFaultCodeRow[] = ble.isConnected ? ble.espFaultCodes : [];

  const criticalCount = faultCodes.filter(f => f.severity === 'critical').length;
  const warningCount = faultCodes.filter(f => f.severity === 'warning').length;
  const totalFaults = faultCodes.length;

  const filteredFaults = useMemo(() => {
    const q = faultQuery.trim().toLowerCase();
    if (!q) return faultCodes;
    return faultCodes.filter(
      f =>
        f.code.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q),
    );
  }, [faultCodes, faultQuery]);

  const exportDiagnosticsJson = useCallback(async () => {
    setExporting(true);
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        source: ble.isConnected ? 'esp32_ble' : 'offline',
        bleConnected: ble.isConnected,
        faultCodes: ble.isConnected ? ble.espFaultCodes : [],
        telemetry: ble.telemetry,
        tripBroadcast: ble.espTripBroadcast,
        tripJson: ble.lastTripJson,
        histJson: ble.lastHistJson,
        histTrips: ble.espHistTrips,
      };
      const path = await saveFuelFlowJsonFile(
        'diagnostics-snapshot',
        JSON.stringify(payload, null, 2),
      );
      alertSavedPath(path, t);
    } catch (e) {
      Alert.alert(t('export_json'), String(e));
    } finally {
      setExporting(false);
    }
  }, [
    ble.isConnected,
    ble.espFaultCodes,
    ble.telemetry,
    ble.lastTripJson,
    ble.espTripBroadcast,
    ble.lastHistJson,
    ble.espHistTrips,
    t,
  ]);

  const onRefreshEsp = useCallback(async () => {
    if (!ble.isConnected) return;
    setRefreshing(true);
    try {
      await ble.refreshEspLive();
    } finally {
      setRefreshing(false);
    }
  }, [ble]);

  const getSeverityColor = (severity: string) =>
    severity === 'critical' ? colors.danger : colors.warning;

  const getSeverityBg = (severity: string) =>
    severity === 'critical' ? `${colors.danger}20` : `${colors.warning}20`;
  const bottomSpacerStyle = styles.bottomSpacer;

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
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Icon name="download" size={15} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.refreshBtn, { borderColor: colors.border }]}
              onPress={onRefreshEsp}
              disabled={refreshing || !ble.isConnected}
            >
              {refreshing ? (
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

        {ble.isConnected ? (
          <View
            style={[
              styles.espLiveCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.espLiveTitle, { color: colors.textSecondary }]}>
              {t('diag_live_esp')}
            </Text>
            <Text style={[styles.espLiveLine, { color: colors.text }]}>
              spd {ble.telemetry.speed} · rpm {ble.telemetry.rpm} · thr{' '}
              {ble.telemetry.throttlePosition}% · cool {ble.telemetry.coolant}°C · iat{' '}
              {ble.telemetry.iat != null ? `${ble.telemetry.iat.toFixed(0)}°C` : '—'} · run{' '}
              {ble.telemetry.engineRunning ? '1' : '0'}
            </Text>
            <Text style={[styles.espLiveLine, { color: colors.text }]}>
              lph {ble.telemetry.lph?.toFixed(2) ?? '—'} · l100{' '}
              {ble.telemetry.fuelConsumption.toFixed(1)} · kpl{' '}
              {ble.telemetry.kpl?.toFixed(2) ?? '—'} · mpg{' '}
              {ble.telemetry.mpg?.toFixed(1) ?? '—'}
            </Text>
            <Text style={[styles.espLiveLine, { color: colors.text }]}>
              {t('efficiency_score')} {ble.telemetry.efficiencyScore ?? '—'} ·{' '}
              {t('hard_accel_events')} {ble.telemetry.hardAccel ?? '—'} ·{' '}
              {t('hard_brake_events')} {ble.telemetry.hardBrake ?? '—'}
            </Text>
            {ble.espTripBroadcast?.rtcTimeString ? (
              <Text style={[styles.espLiveRtc, { color: colors.textSecondary }]}>
                {t('device_rtc_time')}: {ble.espTripBroadcast.rtcTimeString}
              </Text>
            ) : null}
          </View>
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
          {!ble.isConnected ? null : totalFaults === 0 ? (
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
                {t('no_ecu_codes')}
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
                    {fault.description ? (
                      <Text
                        style={[
                          styles.faultDescription,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {fault.description}
                      </Text>
                    ) : null}
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
              CAN 500 kbps
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
  espLiveCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  espLiveTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  espLiveLine: { fontSize: 11, lineHeight: 17, fontFamily: 'Courier New' },
  espLiveRtc: { fontSize: 10, marginTop: 4 },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
  },
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
