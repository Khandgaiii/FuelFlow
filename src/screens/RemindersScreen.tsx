import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import firestore from '@react-native-firebase/firestore';
import { Icon } from '../components/Icon';
import { RemindersTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../navigation/RootNavigator';

// --- Types ---
interface RemindersData {
  oilLifePercent: number;
  oilServiceKm: number;
  oilType: string;
  lastOilServiceKm: number;

  fuelLevelPercent: number;
  fuelRangeKm: number;
  tankCapacityL: number;
  avgConsumption: number;

  // Nearest station coords (set by car/OBD device or manual)
  nearestStationLat: number;
  nearestStationLng: number;
  nearestStationName: string;
  nearestStationKm: number;

  nextServiceKm: number;
  nextServiceDate: string;
}

const EMPTY_REMINDERS: RemindersData = {
  oilLifePercent: 0,
  oilServiceKm: 0,
  oilType: '—',
  lastOilServiceKm: 0,

  fuelLevelPercent: 0,
  fuelRangeKm: 0,
  tankCapacityL: 0,
  avgConsumption: 0,

  // Default: Ulaanbaatar city center
  nearestStationLat: 47.9184676,
  nearestStationLng: 106.9177016,
  nearestStationName: '—',
  nearestStationKm: 0,

  nextServiceKm: 0,
  nextServiceDate: '—',
};

// --- Leaflet OSM Map HTML ---
const buildMapHTML = (lat: number, lng: number, stationName: string, stationKm: number, isDark: boolean) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    body { background: ${isDark ? '#111' : '#f5f5f5'}; }
    .leaflet-container { background: ${isDark ? '#1a1a1a' : '#e8e8e8'}; }
    .custom-pin {
      background: #EF4444;
      width: 14px; height: 14px;
      border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 0 0 2px #EF4444, 0 2px 8px rgba(0,0,0,0.4);
    }
    .station-label {
      background: ${isDark ? '#1e1e1e' : '#fff'};
      color: ${isDark ? '#fff' : '#111'};
      font-family: monospace;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid ${isDark ? '#333' : '#ddd'};
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${lat}, ${lng}],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      ${isDark ? "className: 'dark-tiles'," : ''}
    }).addTo(map);

    ${isDark ? `
    // Dark filter via CSS injection
    var style = document.createElement('style');
    style.innerHTML = '.leaflet-tile { filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9); }';
    document.head.appendChild(style);
    ` : ''}

    // Station marker
    var pinIcon = L.divIcon({ className: '', html: '<div class="custom-pin"></div>', iconSize: [14,14], iconAnchor: [7,7] });
    L.marker([${lat}, ${lng}], { icon: pinIcon }).addTo(map);

    // Label
    var label = '${stationName !== '—' ? stationName : 'Ойрын шатахуун'}${stationKm > 0 ? ` · ${stationKm} km` : ''}';
    L.marker([${lat}, ${lng}], {
      icon: L.divIcon({ className: '', html: '<div class="station-label">' + label + '</div>', iconSize: [0,0], iconAnchor: [-16, 28] })
    }).addTo(map);
  </script>
</body>
</html>
`;

// --- Reusable progress stat card ---
interface StatCardProps {
  label: string;
  value: number;
  unit: string;
  barColor: string;
  maxValue?: number;
  badgeText?: string;
  badgeColor?: string;
  subStats?: { label: string; value: string }[];
  colors: any;
  noData?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, unit, barColor, maxValue = 100, badgeText, badgeColor, subStats, colors, noData,
}) => {
  const pct = Math.min((value / maxValue) * 100, 100);
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={[cardStyles.topBar, { backgroundColor: barColor }]} />
      <View style={cardStyles.header}>
        <Text style={[cardStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        {badgeText && badgeColor && (
          <View style={[cardStyles.badge, { backgroundColor: `${badgeColor}20` }]}>
            <Text style={[cardStyles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
        )}
      </View>
      <View style={cardStyles.valueRow}>
        <Text style={[cardStyles.bigValue, { color: noData ? 'rgba(255,255,255,0.15)' : barColor }]}>
          {noData ? '—' : value}
        </Text>
        <Text style={[cardStyles.unit, { color: barColor, opacity: 0.6 }]}>{unit}</Text>
      </View>
      <View style={[cardStyles.track, { backgroundColor: colors.border }]}>
        <View style={[cardStyles.fill, { backgroundColor: barColor, width: noData ? '0%' : `${pct}%` }]} />
      </View>
      {subStats && (
        <View style={cardStyles.subStatsRow}>
          {subStats.map((s, i) => (
            <View key={i} style={[cardStyles.subStatBox, { backgroundColor: `${colors.border}50` }]}>
              <Text style={[cardStyles.subStatLabel, { color: colors.textSecondary }]}>{s.label}</Text>
              <Text style={[cardStyles.subStatValue, { color: noData ? colors.textSecondary : colors.text }]}>
                {noData ? '—' : s.value}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden', padding: 16 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 8 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 },
  bigValue: { fontSize: 40, fontWeight: '800', fontFamily: 'Courier New', letterSpacing: -1 },
  unit: { fontSize: 18, fontWeight: '700', fontFamily: 'Courier New' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  fill: { height: '100%', borderRadius: 3 },
  subStatsRow: { flexDirection: 'row', gap: 8 },
  subStatBox: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  subStatLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, marginBottom: 3 },
  subStatValue: { fontSize: 12, fontWeight: '700', fontFamily: 'Courier New' },
});

// --- Main Screen ---
const RemindersScreen: React.FC<RemindersTabScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();

  const [data, setData] = useState<RemindersData>(EMPTY_REMINDERS);
  const [isFetching, setIsFetching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const isDark = colors.background === '#000000' || colors.background === '#000'
    || (colors.background ?? '').toLowerCase() < '#888888';

  // --- Firestore: users/{uid}/reminders/latest ---
  const fetchReminders = async () => {
    if (!user?.uid) return;
    setIsFetching(true);
    try {
      const docRef = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('reminders')
        .doc('latest');

      const docSnap = await docRef.get();

      if (docSnap.exists()) {
        setData(docSnap.data() as RemindersData);
      } else {
        console.log(`[FuelFlow] No reminders for UID ${user.uid} — initializing...`);
        await docRef.set({
          ...EMPTY_REMINDERS,
          lastUpdated: firestore.FieldValue.serverTimestamp(),
        });
        setData(EMPTY_REMINDERS);
      }
    } catch (err) {
      console.error('[FuelFlow] Reminders fetch error:', err);
    } finally {
      setIsFetching(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [user]);

  const noData = data.fuelLevelPercent === 0 && data.oilLifePercent === 0;

  const oilBadge = data.oilLifePercent > 0 && data.oilLifePercent <= 20
    ? { text: 'СОЛИХ ШААРДЛАГАТАЙ', color: colors.warning }
    : null;

  const fuelBadge = data.fuelLevelPercent > 0 && data.fuelLevelPercent <= 15
    ? { text: 'БАГА БАЙНА', color: colors.danger }
    : null;

  if (isInitialLoad) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Сануулагч ачааллаж байна...
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
      >

        {/* ── Section Header ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>САНУУЛАГЧ</Text>
          <TouchableOpacity
            style={[styles.refreshBtn, { borderColor: colors.border }]}
            onPress={fetchReminders}
            disabled={isFetching}
          >
            {isFetching
              ? <ActivityIndicator size="small" color={colors.textSecondary} />
              : <Icon name="refresh-cw" size={15} color={colors.textSecondary} />
            }
          </TouchableOpacity>
        </View>

        {/* ── No data banner ── */}
        {noData && (
          <View style={[styles.noBanner, { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }]}>
            <Icon name="wifi-off" size={13} color="#F59E0B" />
            <Text style={styles.noBannerText}>Машин холбогдоогүй — Өгөгдөл ирээгүй байна</Text>
          </View>
        )}

        {/* ── Oil Life Card ── */}
        <StatCard
          label="ТОСНЫ ҮЛДЭГДЭЛ"
          value={data.oilLifePercent}
          unit="%"
          barColor={colors.warning ?? '#F59E0B'}
          maxValue={100}
          badgeText={oilBadge?.text}
          badgeColor={oilBadge?.color}
          subStats={[
            { label: 'ТОС ТӨРӨЛ', value: data.oilType },
            { label: 'СҮҮЛИЙН СОЛИХ', value: data.lastOilServiceKm > 0 ? `${data.lastOilServiceKm} km` : '—' },
          ]}
          colors={colors}
          noData={noData}
        />

        {/* ── Fuel Level Card ── */}
        <StatCard
          label="ШАТАХУУН"
          value={data.fuelLevelPercent}
          unit="%"
          barColor={colors.danger ?? '#EF4444'}
          maxValue={100}
          badgeText={fuelBadge?.text}
          badgeColor={fuelBadge?.color}
          subStats={[
            { label: 'БАГТААМЖ', value: data.tankCapacityL > 0 ? `${data.tankCapacityL} L` : '—' },
            { label: 'ЗАРЦУУЛАЛТ', value: data.avgConsumption > 0 ? `${data.avgConsumption} L/100` : '—' },
          ]}
          colors={colors}
          noData={noData}
        />

        {/* ── Nearest Gas Station Map ── */}
        <View style={styles.mapSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ОЙРЫН ШАТАХУУН</Text>
          {data.nearestStationKm > 0 && (
            <View style={[styles.distanceBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.distanceBadgeText, { color: colors.primary }]}>
                {data.nearestStationKm} km
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.mapCard, { borderColor: colors.border }]}>
          <WebView
            source={{
              html: buildMapHTML(
                data.nearestStationLat,
                data.nearestStationLng,
                data.nearestStationName,
                data.nearestStationKm,
                isDark,
              ),
            }}
            style={styles.mapWebView}
            scrollEnabled={false}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
          />
          {data.nearestStationName !== '—' && (
            <View style={[styles.mapFooter, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
              <Icon name="map-pin" size={14} color={colors.danger ?? '#EF4444'} />
              <Text style={[styles.mapFooterText, { color: colors.text }]} numberOfLines={1}>
                {data.nearestStationName}
              </Text>
            </View>
          )}
        </View>

        {/* ── Next Service ── */}
        <View style={[styles.nextServiceCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View>
            <Text style={[styles.nextServiceLabel, { color: colors.textSecondary }]}>
              ДАРААГИЙН ЗАСВАР
            </Text>
            <Text style={[styles.nextServiceValue, { color: noData ? colors.textSecondary : colors.text }]}>
              {noData ? '—' : `${data.nextServiceKm > 0 ? `${data.nextServiceKm} km` : '—'} / ${data.nextServiceDate}`}
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.textSecondary} />
        </View>

        {/* ── Tips ── */}
        <View style={styles.tipsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 10 }]}>
            ЗӨВЛӨМЖ
          </Text>
          {[
            'Дугуйн даралтыг тогтмол шалгаж байх нь шатахуун хэмнэнэ.',
            'Тэргэндээ шаардлагагүй ачаа авч явахаас зайлсхий.',
            'Жигд хурдасч, жигд тормозлох нь хамгийн үр ашигтай.',
          ].map((tip, i) => (
            <View key={i} style={[styles.tipRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.tipDot, { backgroundColor: colors.warning ?? '#F59E0B' }]} />
              <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 13, fontWeight: '500' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 20, paddingBottom: 12,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  refreshBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  noBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, marginBottom: 12,
  },
  noBannerText: { color: '#F59E0B', fontSize: 12, fontWeight: '500', flex: 1 },

  mapSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, paddingBottom: 10,
  },
  distanceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  distanceBadgeText: { fontSize: 11, fontWeight: '700' },

  mapCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 12,
    height: 200,
  },
  mapWebView: { flex: 1, backgroundColor: 'transparent' },
  mapFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1,
  },
  mapFooterText: { fontSize: 12, fontWeight: '600', flex: 1 },

  nextServiceCard: {
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  nextServiceLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  nextServiceValue: { fontSize: 14, fontWeight: '700', fontFamily: 'Courier New' },

  tipsSection: { marginTop: 4 },
  tipRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 11, borderBottomWidth: 1,
  },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  tipText: { fontSize: 13, lineHeight: 19, flex: 1 },
});

export default RemindersScreen;