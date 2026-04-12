import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
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
import { bleService } from '../services/BleService';
import { RadialGauge } from '../components/RadialGauge';
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

function formatDurationSec(sec: number): string {
  if (sec <= 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

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
    }
  }, [db, spinRefresh, user?.uid]);

  useEffect(() => {
    ensureAndFetchTelemetry();
  }, [ensureAndFetchTelemetry]);

  useFocusEffect(
    useCallback(() => {
      if (ble.isConnected) {
        void ble.refreshAllEsp();
      }
    }, [ble.isConnected, ble.refreshAllEsp]),
  );

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
      : tel.mpg != null && tel.mpg > 0
        ? Math.round(tel.mpg * 10) / 10
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

  const trip = ble.espTripStats;
  const bc = ble.espTripBroadcast;
  const hist = ble.espHistTrips;

  const liveJsonRaw = hasEsp ? bleService.getLastLiveJsonRaw() : null;

  type LiveDetailGroup = { title: string; rows: [string, string][] };

  const liveDetailGroups = useMemo((): LiveDetailGroup[] => {
    if (!hasEsp) {
      return [
        {
          title: t('dash_group_fuel_economy'),
          rows: [
            [t('fuel_rate_lph'), '—'],
            [t('fuel_consumption_unit'), '—'],
            [t('km_per_liter'), '—'],
            [t('fuel_mpg_abbr'), '—'],
            [t('efficiency_score'), '—'],
          ],
        },
        {
          title: t('dash_group_driving_events'),
          rows: [
            [t('hard_accel_events'), '—'],
            [t('hard_brake_events'), '—'],
          ],
        },
      ];
    }
    return [
      {
        title: t('dash_group_fuel_economy'),
        rows: [
          [
            t('fuel_rate_lph'),
            tel.lph != null ? `${tel.lph.toFixed(2)} L/h` : '—',
          ],
          [
            t('fuel_consumption_unit'),
            `${tel.fuelConsumption.toFixed(1)} L/100km`,
          ],
          [
            t('km_per_liter'),
            tel.kpl != null && tel.kpl > 0 ? tel.kpl.toFixed(2) : '—',
          ],
          [
            t('fuel_mpg_abbr'),
            tel.mpg != null && tel.mpg > 0 ? tel.mpg.toFixed(1) : '—',
          ],
          [
            t('efficiency_score'),
            tel.efficiencyScore != null ? String(tel.efficiencyScore) : '—',
          ],
        ],
      },
      {
        title: t('dash_group_driving_events'),
        rows: [
          [
            t('hard_accel_events'),
            tel.hardAccel != null ? String(tel.hardAccel) : '—',
          ],
          [
            t('hard_brake_events'),
            tel.hardBrake != null ? String(tel.hardBrake) : '—',
          ],
        ],
      },
    ];
  }, [hasEsp, tel, t]);

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

        {/* ── Live: gauges + fuel / throttle ── */}
        <View
          style={[
            styles.card,
            styles.cardTightTop,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.cardHeadline, { color: colors.textSecondary }]}>
            {t('dashboard_live_esp')}
          </Text>
          {!hasEsp ? (
            <Text style={[styles.tripHint, { color: colors.textSecondary, marginBottom: 8 }]}>
              {t('dashboard_connect_to_see_data')}
            </Text>
          ) : null}
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

          <View style={[styles.metricsRow, styles.metricsRowInCard]}>
            <View
              style={[
                styles.metricCardHalf,
                {
                  backgroundColor: colors.background,
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
                  backgroundColor: colors.background,
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
        </View>

        <View
          style={[
            styles.tripCardHighlight,
            {
              backgroundColor: colors.cardBackground,
              borderColor: hasEsp ? ORANGE : colors.border,
              opacity: hasEsp ? 1 : 0.95,
            },
          ]}
        >
            <Text style={[styles.tripBannerTitle, { color: hasEsp ? ORANGE : colors.textSecondary }]}>
              {t('dashboard_trip_section')}
            </Text>
            {!hasEsp ? (
              <Text style={[styles.tripHint, { color: colors.textSecondary }]}>
                {t('dashboard_connect_to_see_data')}
              </Text>
            ) : !trip ? (
              <Text style={[styles.tripHint, { color: colors.textSecondary }]}>
                {t('dashboard_trip_waiting')}
              </Text>
            ) : null}
            <View style={styles.avgRow}>
              <View style={styles.avgCol}>
                <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>
                  {t('trip_distance_label')}
                </Text>
                <Text style={[styles.avgValue, { color: colors.text }]}>
                  {trip
                    ? metricUnits
                      ? trip.distanceKm.toFixed(2)
                      : (trip.distanceKm * 0.621371).toFixed(2)
                    : '—'}
                </Text>
                <Text style={[styles.avgUnit, { color: colors.textSecondary }]}>
                  {metricUnits ? 'km' : 'mi'}
                </Text>
              </View>
              <View style={[styles.avgDivider, { backgroundColor: colors.border }]} />
              <View style={styles.avgCol}>
                <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>
                  {t('avg_speed')}
                </Text>
                <Text style={[styles.avgValue, { color: colors.text }]}>
                  {trip
                    ? metricUnits
                      ? trip.avgSpeedKmh.toFixed(0)
                      : Math.round(trip.avgSpeedKmh * 0.621371).toString()
                    : '—'}
                </Text>
                <Text style={[styles.avgUnit, { color: colors.textSecondary }]}>
                  {speedUnit}
                </Text>
              </View>
              <View style={[styles.avgDivider, { backgroundColor: colors.border }]} />
              <View style={styles.avgCol}>
                <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>
                  {t('avg_fuel')}
                </Text>
                <Text style={[styles.avgValue, { color: colors.text }]}>
                  {trip
                    ? metricUnits
                      ? trip.l100.toFixed(1)
                      : trip.mpg > 0.05
                        ? trip.mpg.toFixed(1)
                        : '—'
                    : '—'}
                </Text>
                <Text style={[styles.avgUnit, { color: colors.textSecondary }]}>
                  {fuelUnit}
                </Text>
              </View>
            </View>
            <View style={[styles.avgRow, { marginTop: 12 }]}>
              <View style={styles.avgCol}>
                <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>
                  {t('trip_duration_label')}
                </Text>
                <Text style={[styles.avgValue, { color: colors.text }]}>
                  {trip ? formatDurationSec(trip.durationSec) : '—'}
                </Text>
                <Text style={[styles.avgUnit, { color: colors.textSecondary }]}> </Text>
              </View>
              <View style={[styles.avgDivider, { backgroundColor: colors.border }]} />
              <View style={styles.avgCol}>
                <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>
                  {t('trip_fuel_liters')}
                </Text>
                <Text style={[styles.avgValue, { color: colors.text }]}>
                  {trip ? trip.fuelLiters.toFixed(3) : '—'}
                </Text>
                <Text style={[styles.avgUnit, { color: colors.textSecondary }]}>L</Text>
              </View>
              <View style={[styles.avgDivider, { backgroundColor: colors.border }]} />
              <View style={styles.avgCol}>
                <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>
                  {t('efficiency_score')}
                </Text>
                <Text style={[styles.avgValue, { color: colors.text }]}>
                  {trip ? String(trip.score) : '—'}
                </Text>
                <Text style={[styles.avgUnit, { color: colors.textSecondary }]}>
                  ha {trip?.hardAccel ?? '—'} / hb {trip?.hardBrake ?? '—'}
                </Text>
              </View>
            </View>
            {bc?.rtcTimeString ? (
              <Text style={[styles.rtcHint, { color: colors.textSecondary }]}>
                {t('device_rtc_time')}: {bc.rtcTimeString}
              </Text>
            ) : null}
          </View>

        <View
          style={[
            styles.avgCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
            <Text style={[styles.avgSectionTitle, { color: colors.text }]}>
              {t('dashboard_instant_economy')}
            </Text>
            {liveDetailGroups.map((group, gi) => (
              <View
                key={group.title}
                style={[styles.metricGroup, gi > 0 && styles.metricGroupSpaced]}
              >
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
                  {group.title}
                </Text>
                {group.rows.map(([label, val], idx) => (
                  <View
                    key={`${group.title}-${label}-${idx}`}
                    style={styles.infoRow}
                  >
                    <Text
                      style={[styles.infoRowLabel, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {label}
                    </Text>
                    <Text
                      style={[
                        styles.infoRowValue,
                        { color: hasEsp ? colors.text : colors.textSecondary },
                      ]}
                      selectable={hasEsp}
                    >
                      {val}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

        <View
          style={[
            styles.avgCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
            <Text style={[styles.avgSectionTitle, { color: colors.text }]}>
              {t('dashboard_period_totals')}
            </Text>
            {bc && hasEsp
              ? (['day', 'week', 'month'] as const).map(period => {
                  const a = bc[period];
                  const label =
                    period === 'day'
                      ? t('agg_today')
                      : period === 'week'
                        ? t('agg_this_week')
                        : t('agg_this_month');
                  return (
                    <View key={period} style={styles.aggBlock}>
                      <Text style={[styles.aggTitle, { color: colors.text }]}>
                        {label}
                      </Text>
                      <Text style={[styles.aggLine, { color: colors.textSecondary }]}>
                        {(metricUnits
                          ? a.distanceKm.toFixed(1)
                          : (a.distanceKm * 0.621371).toFixed(1))}{' '}
                        {metricUnits ? 'km' : 'mi'} · {a.fuelLiters.toFixed(2)} L ·{' '}
                        {formatDurationSec(a.durationSec)} · {t('avg_speed')}{' '}
                        {(metricUnits
                          ? a.avgSpeed.toFixed(0)
                          : Math.round(a.avgSpeed * 0.621371))}{' '}
                        {speedUnit}
                      </Text>
                      <Text style={[styles.aggLine, { color: colors.textSecondary }]}>
                        {metricUnits
                          ? `${a.l100.toFixed(1)} L/100km`
                          : `${a.mpg.toFixed(1)} mpg`}{' '}
                        · {t('km_per_liter')} {a.kpl.toFixed(2)} ·{' '}
                        {t('efficiency_score')} {a.score.toFixed(0)} · {t('trip_count_n')}{' '}
                        {a.tripCount}
                      </Text>
                    </View>
                  );
                })
              : (['day', 'week', 'month'] as const).map(period => {
                  const label =
                    period === 'day'
                      ? t('agg_today')
                      : period === 'week'
                        ? t('agg_this_week')
                        : t('agg_this_month');
                  return (
                    <View key={period} style={styles.aggBlock}>
                      <Text style={[styles.aggTitle, { color: colors.text }]}>
                        {label}
                      </Text>
                      <Text style={[styles.aggLine, { color: colors.textSecondary }]}>
                        — · — · — · — · —
                      </Text>
                      <Text style={[styles.aggLine, { color: colors.textSecondary }]}>
                        — · — · — · {t('trip_count_n')} —
                      </Text>
                    </View>
                  );
                })}
          </View>

        <View
          style={[
            styles.avgCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
            <Text style={[styles.avgSectionTitle, { color: colors.text }]}>
              {t('hist_recent_sd')}
            </Text>
            {!hasEsp || hist.length === 0 ? (
              <Text style={[styles.histLine, { color: colors.textSecondary }]}>
                {t('hist_empty_placeholder')}
              </Text>
            ) : (
              hist
                .slice(-5)
                .reverse()
                .map((row, idx) => (
                  <Text
                    key={`${row.ts}-${idx}`}
                    style={[styles.histLine, { color: colors.textSecondary }]}
                  >
                    {row.ts ? new Date(row.ts * 1000).toLocaleString() : '—'} ·{' '}
                    {(metricUnits
                      ? row.distanceKm.toFixed(1)
                      : (row.distanceKm * 0.621371).toFixed(1))}{' '}
                    {metricUnits ? 'km' : 'mi'} ·{' '}
                    {metricUnits
                      ? `${row.l100.toFixed(1)} L/100km`
                      : `${row.mpg.toFixed(1)} mpg`}{' '}
                    · {t('efficiency_score')} {row.score}
                  </Text>
                ))
            )}
          </View>

        <View
          style={[
            styles.card,
            styles.cardRawJson,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.rawJsonLabel, { color: colors.textSecondary }]}>
            {t('esp_ble_payload')}
          </Text>
          {liveJsonRaw ? (
            <Text
              selectable
              style={[styles.rawJson, { color: colors.textSecondary }]}
            >
              {liveJsonRaw}
            </Text>
          ) : (
            <Text style={[styles.rawJson, { color: colors.textSecondary }]}>
              {t('esp_ble_payload_empty')}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

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
  tripCardHighlight: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    borderLeftWidth: 5,
    borderLeftColor: ORANGE,
  },
  tripBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tripHint: { fontSize: 11, marginBottom: 8 },
  rawJsonLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 6,
  },
  rawJson: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'Courier New',
  },
  aggBlock: { marginBottom: 12, gap: 4 },
  aggTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  aggLine: { fontSize: 11, lineHeight: 16 },
  histLine: { fontSize: 11, lineHeight: 18, marginBottom: 6 },
  rtcHint: { fontSize: 10, marginTop: 10 },

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
  cardTightTop: { marginTop: 8 },
  cardHeadline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    marginBottom: 10,
  },
  cardRawJson: {
    marginTop: 6,
    marginBottom: 20,
  },
  metricsRowInCard: {
    marginTop: 16,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  metricGroup: { marginBottom: 2 },
  metricGroupSpaced: { marginTop: 14 },
  groupTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.65,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.18)',
  },
  infoRowLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  infoRowValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Courier New',
    textAlign: 'right',
    flexShrink: 0,
    maxWidth: '56%',
  },
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
