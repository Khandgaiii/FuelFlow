import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
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
import { DashboardTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useMetricUnits } from '../context/MetricUnitsContext';
import { useAuth } from '../context/AuthContext';
import { useTelemetry } from '../context/TelemetryContext';
import { RadialGauge } from '../components/RadialGauge';
import { VehicleStatus } from '../components/VehicleStatus';
import { AppHeader } from '../navigation/RootNavigator';
import { MAX_RPM, MAX_THROTTLE } from '../constants/telemetry';

const EMPTY_TELEMETRY = {
  speed: 0,
  rpm: 0,
  fuelConsumption: 0,
  throttlePosition: 0,
  battery: 0,
  coolant: 0,
  oilPressure: 0,
  engineLoad: 0,
  lastUpdated: null as any,
};

const ORANGE = '#F97316';
const TEAL = '#14B8A6';

const DashboardScreen: React.FC<DashboardTabScreenProps> = ({
  navigation: _navigation,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { metricUnits } = useMetricUnits();
  const { user } = useAuth();
  const db = getFirestore(getApp());

  const ble = useTelemetry();

  const [isFetching, setIsFetching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Spin animation for refresh icon
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [hasPermissionError, setHasPermissionError] = useState(false);

  /** Live dashboard values come only from ESP32 BLE — never from Firestore. */
  const tel = ble.telemetry;
  const hasEsp = ble.isConnected;

  const spinRefresh = useCallback(() => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // --- Firebase: ensure doc exists, then fetch ---
  const ensureAndFetchTelemetry = useCallback(async () => {
    if (!user?.uid) return;
    setIsFetching(true);
    spinRefresh();
    try {
      const docRef = doc(db, 'users', user.uid, 'telemetry', 'latest');

      const docSnap = await getDoc(docRef);

      if (!docSnap.exists) {
        console.log(
          `[FuelFlow] No doc for UID ${user.uid} — creating with zeros...`,
        );
        await setDoc(docRef, {
          ...EMPTY_TELEMETRY,
          lastUpdated: serverTimestamp(),
        });
      }
      setHasPermissionError(false);
    } catch (error: any) {
      if (error?.code === 'firestore/permission-denied') {
        setHasPermissionError(true);
        return;
      }
      console.error('[FuelFlow] Fetch error:', error);
    } finally {
      setIsFetching(false);
      setIsInitialLoad(false);
    }
  }, [db, spinRefresh, user?.uid]);

  useEffect(() => {
    ensureAndFetchTelemetry();
  }, [ensureAndFetchTelemetry]);

  const MAX_AVG_SAMPLES = 180;
  const sessionSamples = useRef<{ s: number; r: number; f: number }[]>([]);
  const [sessionAvg, setSessionAvg] = useState({
    speed: 0,
    rpm: 0,
    fuel: 0,
    n: 0,
  });

  useEffect(() => {
    if (!ble.isConnected) {
      sessionSamples.current = [];
      setSessionAvg({ speed: 0, rpm: 0, fuel: 0, n: 0 });
      return;
    }
    const d = ble.telemetry;
    sessionSamples.current.push({
      s: d.speed,
      r: d.rpm,
      f: d.fuelConsumption,
    });
    if (sessionSamples.current.length > MAX_AVG_SAMPLES) {
      sessionSamples.current.shift();
    }
    const arr = sessionSamples.current;
    const n = arr.length;
    if (n === 0) return;
    setSessionAvg({
      speed: arr.reduce((a, b) => a + b.s, 0) / n,
      rpm: arr.reduce((a, b) => a + b.r, 0) / n,
      fuel: arr.reduce((a, b) => a + b.f, 0) / n,
      n,
    });
  }, [ble.isConnected, ble.telemetry]);

  const speedUnit = metricUnits ? 'km/h' : 'mph';
  const maxSpeed = metricUnits ? 240 : 150;
  const fuelUnit = metricUnits ? 'L/100km' : 'mpg';
  const maxFuel = metricUnits ? 25 : 60;

  const gaugeSpeed = hasEsp
    ? metricUnits
      ? tel.speed
      : Math.round(tel.speed * 0.621371)
    : null;
  const displayFuel = hasEsp
    ? metricUnits
      ? tel.fuelConsumption
      : tel.fuelConsumption > 0
        ? Math.round(235.215 / tel.fuelConsumption)
        : 0
    : null;

  const noData = !hasEsp;
  const scrollContentStyle = styles.scrollContent;
  const fuelValueColorStyle = {
    color: noData ? colors.textSecondary : colors.text,
  };
  const fuelFillStyle = {
    backgroundColor: TEAL,
    width: (noData || displayFuel === null
      ? '0%'
      : `${Math.min((Number(displayFuel) / maxFuel) * 100, 100)}%`) as `${number}%`,
  };
  const throttleValueColorStyle = {
    color: noData ? colors.textSecondary : colors.text,
  };
  const throttleFillStyle = {
    backgroundColor: ORANGE,
    width: (noData
      ? '0%'
      : `${Math.min((tel.throttlePosition / MAX_THROTTLE) * 100, 100)}%`) as `${number}%`,
  };
  const statusCardStyle = styles.statusCard;

  const batteryStatus = (v: number) =>
    v === 0 ? 'good' : v >= 12.4 ? 'good' : v >= 12.0 ? 'warning' : 'critical';
  const coolantStatus = (v: number) =>
    v === 0 ? 'good' : v <= 95 ? 'good' : v <= 105 ? 'warning' : 'critical';
  const oilStatus = (v: number) =>
    v === 0 ? 'good' : v >= 25 ? 'good' : v >= 15 ? 'warning' : 'critical';
  const engineStatus = (v: number) =>
    v === 0 ? 'good' : v <= 75 ? 'good' : v <= 90 ? 'warning' : 'critical';

  if (isInitialLoad) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('loading_telemetry')}
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
        contentContainerStyle={scrollContentStyle}
      >
        {/* ── No Signal Banner ── */}
        {noData && (
          <View className="flex-row items-center" style={styles.noSignalBanner}>
            <Icon name="wifi-off" size={13} color="#F59E0B" />
            <Text style={styles.noSignalText}>
              {hasPermissionError
                ? t('permission_error')
                : t('no_connection')}
            </Text>
          </View>
        )}

        {/* ── Telemetry header ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('dashboard_title')}
          </Text>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border }]}
            onPress={ensureAndFetchTelemetry}
            disabled={isFetching}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Icon
                name="refresh-cw"
                size={16}
                color={isFetching ? colors.primary : colors.textSecondary}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* ── Gauges Card ── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.gaugesRow}>
            <View style={styles.gaugeWrapper}>
              <RadialGauge
                value={gaugeSpeed}
                maxValue={maxSpeed}
                label={t('speed')}
                unit={speedUnit}
                ringColor={colors.cyan ?? '#06B6D4'}
                size="sm"
              />
            </View>
            <View
              style={[styles.gaugeDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.gaugeWrapper}>
              <RadialGauge
                value={hasEsp ? tel.rpm : null}
                maxValue={MAX_RPM}
                label={t('rpm')}
                unit="x1000"
                ringColor={colors.green ?? '#22C55E'}
                size="sm"
              />
            </View>
          </View>
        </View>

        {ble.isConnected && sessionAvg.n > 0 && (
          <View
            style={[
              styles.avgCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.avgSectionTitle, { color: colors.textSecondary }]}>
              {t('session_averages')} · n={sessionAvg.n}
            </Text>
            <View style={styles.avgRow}>
              <View style={styles.avgCol}>
                <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>
                  {t('avg_speed')}
                </Text>
                <Text style={[styles.avgValue, { color: colors.text }]}>
                  {metricUnits
                    ? sessionAvg.speed.toFixed(1)
                    : Math.round(sessionAvg.speed * 0.621371)}
                </Text>
                <Text style={[styles.avgUnit, { color: colors.textSecondary }]}>
                  {speedUnit}
                </Text>
              </View>
              <View style={[styles.avgDivider, { backgroundColor: colors.border }]} />
              <View style={styles.avgCol}>
                <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>
                  {t('avg_rpm')}
                </Text>
                <Text style={[styles.avgValue, { color: colors.text }]}>
                  {Math.round(sessionAvg.rpm)}
                </Text>
                <Text style={[styles.avgUnit, { color: colors.textSecondary }]}>
                  RPM
                </Text>
              </View>
              <View style={[styles.avgDivider, { backgroundColor: colors.border }]} />
              <View style={styles.avgCol}>
                <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>
                  {t('avg_fuel')}
                </Text>
                <Text style={[styles.avgValue, { color: colors.text }]}>
                  {metricUnits
                    ? sessionAvg.fuel.toFixed(1)
                    : sessionAvg.fuel > 0
                      ? Math.round(235.215 / sessionAvg.fuel)
                      : '—'}
                </Text>
                <Text style={[styles.avgUnit, { color: colors.textSecondary }]}>
                  {fuelUnit}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Fuel + Throttle ── */}
        <View style={styles.metricsRow}>
          <View
            style={[
              styles.metricCardHalf,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {t('fuel_consumption')}
            </Text>
            <Text style={[styles.metricBigValue, fuelValueColorStyle]}>
              {noData || displayFuel === null ? '—' : displayFuel}
            </Text>
            <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>
              {fuelUnit}
            </Text>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, fuelFillStyle]} />
            </View>
          </View>

          <View
            style={[
              styles.metricCardHalf,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {t('throttle_position')}
            </Text>
            <Text style={[styles.metricBigValue, throttleValueColorStyle]}>
              {noData ? '—' : tel.throttlePosition}
            </Text>
            <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>
              %
            </Text>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, throttleFillStyle]} />
            </View>
          </View>
        </View>

        {/* ── System Status ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('system_status')}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
            statusCardStyle,
          ]}
        >
          <VehicleStatus
            items={[
              {
                icon: (
                  <Icon
                    name="zap"
                    size={20}
                    color={noData ? colors.textSecondary : colors.success}
                  />
                ),
                label: t('battery'),
                value: noData ? '— V' : `${Number(tel.battery).toFixed(1)}V`,
                status: batteryStatus(tel.battery),
                color: colors.success,
              },
              {
                icon: (
                  <Icon
                    name="thermometer"
                    size={20}
                    color={noData ? colors.textSecondary : colors.success}
                  />
                ),
                label: t('coolant'),
                value: noData ? '— °C' : `${tel.coolant}°C`,
                status: coolantStatus(tel.coolant),
                color: colors.success,
              },
              {
                icon: (
                  <Icon
                    name="droplets"
                    size={20}
                    color={noData ? colors.textSecondary : colors.success}
                  />
                ),
                label: t('oil_pressure'),
                value: noData ? '— PSI' : `${tel.oilPressure} PSI`,
                status: oilStatus(tel.oilPressure),
                color: colors.success,
              },
              {
                icon: (
                  <Icon
                    name="power"
                    size={20}
                    color={noData ? colors.textSecondary : colors.success}
                  />
                ),
                label: t('engine_load'),
                value: noData ? '— %' : `${tel.engineLoad}%`,
                status: engineStatus(tel.engineLoad),
                color: colors.success,
              },
            ]}
            colors={colors}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: { fontSize: 13, fontWeight: '500' },

  noSignalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  noSignalText: { color: '#F59E0B', fontSize: 12, fontWeight: '500', flex: 1 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avgCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  avgSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  avgRow: { flexDirection: 'row', alignItems: 'stretch' },
  avgCol: { flex: 1, alignItems: 'center' },
  avgDivider: { width: 1, opacity: 0.35 },
  avgLabel: { fontSize: 9, fontWeight: '600', marginBottom: 4 },
  avgValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Courier New',
  },
  avgUnit: { fontSize: 9, marginTop: 2, opacity: 0.6 },

  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },
  statusCard: { padding: 0, overflow: 'hidden' },

  gaugesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  gaugeWrapper: { flex: 1, alignItems: 'center' },
  gaugeDivider: { width: 1, height: 70, opacity: 0.3 },

  metricsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  metricCardHalf: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metricBigValue: {
    fontSize: 30,
    fontWeight: '800',
    fontFamily: 'Courier New',
    letterSpacing: -1,
  },
  metricUnit: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 10,
    opacity: 0.5,
  },
  barTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
});

export default DashboardScreen;
