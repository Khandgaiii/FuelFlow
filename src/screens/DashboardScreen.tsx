import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Icon } from '../components/Icon';
import { DashboardTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useMetricUnits } from '../context/MetricUnitsContext';
import { useAuth } from '../context/AuthContext';
import { RadialGauge } from '../components/RadialGauge'; // ← swap to new RadialGauge.tsx
import { VehicleStatus } from '../components/VehicleStatus';
import { AppHeader } from '../navigation/RootNavigator';
import { MAX_RPM, MAX_THROTTLE } from '../constants/mockData';

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

const DashboardScreen: React.FC<DashboardTabScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { metricUnits } = useMetricUnits();
  const { user } = useAuth();

  const [data, setData] = useState(EMPTY_TELEMETRY);
  const [isFetching, setIsFetching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Pulse animation for live dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Spin animation for refresh icon
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isConnected]);

  const spinRefresh = () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // --- Firebase: ensure doc exists, then fetch ---
  const ensureAndFetchTelemetry = async () => {
    if (!user?.uid) return;
    setIsFetching(true);
    spinRefresh();
    try {
      const docRef = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('telemetry')
        .doc('latest');

      const docSnap = await docRef.get();

      if (docSnap.exists()) {
        const fetched = docSnap.data() as typeof EMPTY_TELEMETRY;
        setData(fetched);
        setIsConnected(fetched.speed > 0 || fetched.rpm > 0 || fetched.battery > 0);
      } else {
        console.log(`[FuelFlow] No doc for UID ${user.uid} — creating with zeros...`);
        await docRef.set({
          ...EMPTY_TELEMETRY,
          lastUpdated: firestore.FieldValue.serverTimestamp(),
        });
        setData(EMPTY_TELEMETRY);
        setIsConnected(false);
      }
      // Record sync time
      const now = new Date();
      setLastSynced(
        now.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (error) {
      console.error('[FuelFlow] Fetch error:', error);
    } finally {
      setIsFetching(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    ensureAndFetchTelemetry();
  }, [user]);

  // --- Simulator ---
  const simulateNewData = async () => {
    if (!user?.uid) return;
    const sim = {
      speed: Math.floor(Math.random() * 120) + 20,
      rpm: Math.floor(Math.random() * 4000) + 1000,
      fuelConsumption: parseFloat((Math.random() * 5 + 6).toFixed(1)),
      throttlePosition: Math.floor(Math.random() * 60) + 10,
      battery: parseFloat((Math.random() * 1.5 + 11.5).toFixed(1)),
      coolant: Math.floor(Math.random() * 30) + 80,
      oilPressure: Math.floor(Math.random() * 20) + 20,
      engineLoad: Math.floor(Math.random() * 50) + 30,
      lastUpdated: firestore.FieldValue.serverTimestamp(),
    };
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('telemetry')
        .doc('latest')
        .set(sim);
      await ensureAndFetchTelemetry();
    } catch (err) {
      console.error('[FuelFlow] Sim error:', err);
    }
  };

  // --- Unit conversions ---
  const displaySpeed = metricUnits ? data.speed : Math.round(data.speed * 0.621371);
  const speedUnit = metricUnits ? 'km/h' : 'mph';
  const maxSpeed = metricUnits ? 240 : 150;
  const fuelUnit = metricUnits ? 'L/100km' : 'mpg';
  const displayFuel = metricUnits
    ? data.fuelConsumption
    : data.fuelConsumption > 0
    ? Math.round(235.215 / data.fuelConsumption)
    : 0;
  const maxFuel = metricUnits ? 25 : 60;

  const noData = !isConnected;

  const batteryStatus = (v: number) => (v === 0 ? 'good' : v >= 12.4 ? 'good' : v >= 12.0 ? 'warning' : 'critical');
  const coolantStatus = (v: number) => (v === 0 ? 'good' : v <= 95 ? 'good' : v <= 105 ? 'warning' : 'critical');
  const oilStatus = (v: number) => (v === 0 ? 'good' : v >= 25 ? 'good' : v >= 15 ? 'warning' : 'critical');
  const engineStatus = (v: number) => (v === 0 ? 'good' : v <= 75 ? 'good' : v <= 90 ? 'warning' : 'critical');

  if (isInitialLoad) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Телеметри ачааллаж байна...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader vehicleName="FuelFlow" />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >

        {/* ── No Signal Banner ── */}
        {noData && (
          <View style={styles.noSignalBanner}>
            <Icon name="wifi-off" size={13} color="#F59E0B" />
            <Text style={styles.noSignalText}>
              Машин холбогдоогүй — Симуляц ашиглаж туршина уу
            </Text>
          </View>
        )}

        {/* ── Section Header: Live ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Animated.View style={[styles.liveDot, { opacity: isConnected ? pulseAnim : 0.2 }]} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {isConnected ? 'LIVE' : 'NO SIGNAL'}
            </Text>
            {lastSynced && (
              <Text style={[styles.syncTime, { color: colors.textSecondary }]}>
                · {lastSynced}
              </Text>
            )}
          </View>

          <View style={styles.actionBtns}>
            {/* Simulate button */}
            <TouchableOpacity
              style={[styles.iconBtn, { borderColor: 'rgba(249,115,22,0.3)', backgroundColor: 'rgba(249,115,22,0.08)' }]}
              onPress={simulateNewData}
              disabled={isFetching}
            >
              <Icon name="upload-cloud" size={16} color={ORANGE} />
            </TouchableOpacity>

            {/* Refresh button */}
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
        </View>

        {/* ── Gauges Card ── */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.gaugesRow}>
            <View style={styles.gaugeWrapper}>
              <RadialGauge
                value={displaySpeed}
                maxValue={maxSpeed}
                label={t('speed')}
                unit={speedUnit}
                ringColor={colors.cyan ?? '#06B6D4'}
                size="sm"
              />
            </View>
            <View style={[styles.gaugeDivider, { backgroundColor: colors.border }]} />
            <View style={styles.gaugeWrapper}>
              <RadialGauge
                value={data.rpm}
                maxValue={MAX_RPM}
                label={t('rpm')}
                unit="x1000"
                ringColor={colors.green ?? '#22C55E'}
                size="sm"
              />
            </View>
          </View>
        </View>

        {/* ── Fuel + Throttle ── */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCardHalf, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t('fuel_consumption')}</Text>
            <Text style={[styles.metricBigValue, { color: noData ? 'rgba(255,255,255,0.15)' : colors.text }]}>
              {noData ? '—' : displayFuel}
            </Text>
            <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>{fuelUnit}</Text>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: TEAL,
                    width: noData ? '0%' : `${Math.min((Number(displayFuel) / maxFuel) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={[styles.metricCardHalf, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t('throttle_position')}</Text>
            <Text style={[styles.metricBigValue, { color: noData ? 'rgba(255,255,255,0.15)' : colors.text }]}>
              {noData ? '—' : data.throttlePosition}
            </Text>
            <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>%</Text>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: ORANGE,
                    width: noData ? '0%' : `${Math.min((data.throttlePosition / MAX_THROTTLE) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* ── System Status ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SYSTEM STATUS</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
          <VehicleStatus
            items={[
              {
                icon: <Icon name="zap" size={20} color={noData ? colors.textSecondary : colors.success} />,
                label: t('battery'),
                value: noData ? '— V' : `${Number(data.battery).toFixed(1)}V`,
                status: batteryStatus(data.battery),
                color: colors.success,
              },
              {
                icon: <Icon name="thermometer" size={20} color={noData ? colors.textSecondary : colors.success} />,
                label: t('coolant'),
                value: noData ? '— °C' : `${data.coolant}°C`,
                status: coolantStatus(data.coolant),
                color: colors.success,
              },
              {
                icon: <Icon name="droplets" size={20} color={noData ? colors.textSecondary : colors.success} />,
                label: t('oil_pressure'),
                value: noData ? '— PSI' : `${data.oilPressure} PSI`,
                status: oilStatus(data.oilPressure),
                color: colors.success,
              },
              {
                icon: <Icon name="power" size={20} color={noData ? colors.textSecondary : colors.success} />,
                label: t('engine_load'),
                value: noData ? '— %' : `${data.engineLoad}%`,
                status: engineStatus(data.engineLoad),
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

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
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
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  syncTime: { fontSize: 11, opacity: 0.5 },

  actionBtns: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },

  gaugesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
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
  metricLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  metricBigValue: { fontSize: 30, fontWeight: '800', fontFamily: 'Courier New', letterSpacing: -1 },
  metricUnit: { fontSize: 10, fontWeight: '500', marginBottom: 10, opacity: 0.5 },
  barTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
});

export default DashboardScreen;