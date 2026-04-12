import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import { getApp } from '@react-native-firebase/app';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
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

// --- Leaflet OSM Map HTML (fetches nearby fuel stations via Overpass API) ---
const buildMapHTML = (
  userLat: number,
  userLng: number,
  isDark: boolean,
) => `
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
    .station-pin {
      background: #EF4444;
      width: 12px; height: 12px;
      border-radius: 50%;
      border: 2.5px solid #fff;
      box-shadow: 0 0 0 1.5px #EF4444, 0 2px 6px rgba(0,0,0,0.35);
    }
    .station-pin.nearest {
      background: #22C55E;
      width: 16px; height: 16px;
      border: 3px solid #fff;
      box-shadow: 0 0 0 2px #22C55E, 0 2px 8px rgba(0,0,0,0.4);
    }
    .user-pin {
      background: #3B82F6;
      width: 14px; height: 14px;
      border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 0 0 2px #3B82F6, 0 0 12px rgba(59,130,246,0.5);
    }
    .user-pulse {
      position: absolute;
      top: -6px; left: -6px;
      width: 26px; height: 26px;
      border-radius: 50%;
      background: rgba(59,130,246,0.2);
      animation: pulse 2s ease-out infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .station-label {
      background: ${isDark ? '#1e1e1e' : '#fff'};
      color: ${isDark ? '#fff' : '#111'};
      font-family: -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid ${isDark ? '#333' : '#ddd'};
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .station-label .dist {
      color: ${isDark ? '#9CA3AF' : '#6B7280'};
      font-size: 10px;
      font-weight: 500;
    }
    .station-label.nearest {
      border-color: #22C55E;
      background: ${isDark ? '#0a2010' : '#F0FDF4'};
    }
    .status-bar {
      position: absolute;
      bottom: 8px; left: 8px; right: 8px;
      z-index: 1000;
      background: ${isDark ? '#1e1e1e' : '#fff'};
      color: ${isDark ? '#ccc' : '#333'};
      font-family: -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 600;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid ${isDark ? '#333' : '#ddd'};
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="status" class="status-bar">Searching for gas stations...</div>
  <script>
    var userLat = ${userLat}, userLng = ${userLng};
    var statusEl = document.getElementById('status');

    var map = L.map('map', {
      center: [userLat, userLng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.scale({ imperial: false, metric: true, maxWidth: 120 }).addTo(map);

    ${isDark ? `
    var style = document.createElement('style');
    style.innerHTML = '.leaflet-tile { filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9); }';
    document.head.appendChild(style);
    ` : ''}

    // User location marker
    var userIcon = L.divIcon({
      className: '',
      html: '<div style="position:relative"><div class="user-pulse"></div><div class="user-pin"></div></div>',
      iconSize: [14,14], iconAnchor: [7,7]
    });
    L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

    function toRad(d) { return d * Math.PI / 180; }
    function haversine(lat1, lng1, lat2, lng2) {
      var R = 6371;
      var dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
      var a = Math.sin(dLat/2)*Math.sin(dLat/2) +
              Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) *
              Math.sin(dLng/2)*Math.sin(dLng/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function renderStations(elements) {
      var stations = elements.map(function(el) {
        var slat = el.lat || (el.center && el.center.lat);
        var slng = el.lon || (el.center && el.center.lon);
        if (!slat || !slng) return null;
        var name = (el.tags && (el.tags.name || el.tags.brand || el.tags.operator)) || 'Gas Station';
        var dist = haversine(userLat, userLng, slat, slng);
        return { lat: slat, lng: slng, name: name, dist: dist };
      }).filter(function(s) { return s; });

      stations.sort(function(a, b) { return a.dist - b.dist; });

      if (stations.length === 0) {
        statusEl.textContent = 'No gas stations found nearby';
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'no_stations' }));
        return;
      }

      var bounds = [[userLat, userLng]];
      stations.forEach(function(s, i) {
        var isNearest = (i === 0);
        var pinClass = isNearest ? 'station-pin nearest' : 'station-pin';
        var labelClass = isNearest ? 'station-label nearest' : 'station-label';
        var size = isNearest ? [16,16] : [12,12];
        var anchor = isNearest ? [8,8] : [6,6];

        var icon = L.divIcon({ className: '', html: '<div class="' + pinClass + '"></div>', iconSize: size, iconAnchor: anchor });
        var marker = L.marker([s.lat, s.lng], { icon: icon }).addTo(map);

        var distText = s.dist < 1 ? (s.dist * 1000).toFixed(0) + ' m' : s.dist.toFixed(1) + ' km';
        marker.bindPopup('<b>' + s.name + '</b><br><span style="color:#6B7280;font-size:12px">' + distText + '</span>', { closeButton: false });

        if (isNearest || i < 5) {
          var lbl = L.divIcon({
            className: '',
            html: '<div class="' + labelClass + '">' + s.name + ' <span class="dist">' + distText + '</span></div>',
            iconSize: [0,0], iconAnchor: [-12, 24]
          });
          L.marker([s.lat, s.lng], { icon: lbl, interactive: false }).addTo(map);
        }
        bounds.push([s.lat, s.lng]);
      });

      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });

      var nearest = stations[0];
      var nDist = nearest.dist < 1 ? (nearest.dist * 1000).toFixed(0) + ' m' : nearest.dist.toFixed(1) + ' km';
      statusEl.innerHTML = '<span style="color:#22C55E">\\u25CF</span> ' +
        stations.length + ' stations &middot; Nearest: <b>' + nearest.name + '</b> (' + nDist + ')';

      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'stations_loaded',
        count: stations.length,
        nearest: { name: nearest.name, dist: nearest.dist, lat: nearest.lat, lng: nearest.lng }
      }));
    }

    var OVERPASS_SERVERS = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ];

    function tryFetch(serverIdx) {
      if (serverIdx >= OVERPASS_SERVERS.length) {
        statusEl.textContent = 'Could not load stations (network error)';
        return;
      }
      var radius = 5000;
      var query = '[out:json][timeout:15];(node["amenity"="fuel"](around:' + radius + ',' + userLat + ',' + userLng + ');way["amenity"="fuel"](around:' + radius + ',' + userLat + ',' + userLng + '););out center body;';
      var url = OVERPASS_SERVERS[serverIdx];

      statusEl.textContent = 'Searching for gas stations...';

      fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        if (data && data.elements) {
          renderStations(data.elements);
        } else {
          throw new Error('Bad response');
        }
      })
      .catch(function(err) {
        tryFetch(serverIdx + 1);
      });
    }

    tryFetch(0);
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
  label,
  value,
  unit,
  barColor,
  maxValue = 100,
  badgeText,
  badgeColor,
  subStats,
  colors,
  noData,
}) => {
  const pct = Math.min((value / maxValue) * 100, 100);
  const statValueColorStyle = {
    color: noData ? colors.textSecondary : barColor,
  };
  const statUnitStyle = { color: barColor, opacity: 0.6 };
  const statFillStyle = {
    backgroundColor: barColor,
    width: (noData ? '0%' : `${pct}%`) as import('react-native').DimensionValue,
  };
  return (
    <View
      style={[
        cardStyles.card,
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
      ]}
    >
      <View style={[cardStyles.topBar, { backgroundColor: barColor }]} />
      <View style={cardStyles.header}>
        <Text style={[cardStyles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
        {badgeText && badgeColor && (
          <View
            style={[cardStyles.badge, { backgroundColor: `${badgeColor}20` }]}
          >
            <Text style={[cardStyles.badgeText, { color: badgeColor }]}>
              {badgeText}
            </Text>
          </View>
        )}
      </View>
      <View style={cardStyles.valueRow}>
        <Text style={[cardStyles.bigValue, statValueColorStyle]}>
          {noData ? '—' : value}
        </Text>
        <Text style={[cardStyles.unit, statUnitStyle]}>{unit}</Text>
      </View>
      <View style={[cardStyles.track, { backgroundColor: colors.border }]}>
        <View style={[cardStyles.fill, statFillStyle]} />
      </View>
      {subStats && (
        <View style={cardStyles.subStatsRow}>
          {subStats.map((s, i) => (
            <View
              key={i}
              style={[
                cardStyles.subStatBox,
                { backgroundColor: `${colors.border}50` },
              ]}
            >
              <Text
                style={[
                  cardStyles.subStatLabel,
                  { color: colors.textSecondary },
                ]}
              >
                {s.label}
              </Text>
              <Text
                style={[
                  cardStyles.subStatValue,
                  { color: noData ? colors.textSecondary : colors.text },
                ]}
              >
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 16,
  },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 10,
  },
  bigValue: {
    fontSize: 40,
    fontWeight: '800',
    fontFamily: 'Courier New',
    letterSpacing: -1,
  },
  unit: { fontSize: 18, fontWeight: '700', fontFamily: 'Courier New' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  fill: { height: '100%', borderRadius: 3 },
  subStatsRow: { flexDirection: 'row', gap: 8 },
  subStatBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  subStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  subStatValue: { fontSize: 12, fontWeight: '700', fontFamily: 'Courier New' },
});

// --- Main Screen ---
const RemindersScreen: React.FC<RemindersTabScreenProps> = ({
  navigation: _navigation,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();
  const db = getFirestore(getApp());

  const [data, setData] = useState<RemindersData>(EMPTY_REMINDERS);
  const [isFetching, setIsFetching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [nearestStation, setNearestStation] = useState<{
    name: string;
    dist: number;
    count: number;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const locationFetched = useRef(false);

  const isDark =
    colors.background === '#000000' ||
    colors.background === '#000' ||
    (colors.background ?? '').toLowerCase() < '#888888';

  useEffect(() => {
    if (locationFetched.current) return;
    locationFetched.current = true;

    const requestAndGetLocation = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'FuelFlow needs your location to find nearby gas stations.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return;
        }
      }

      Geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setMapKey((k) => k + 1);
        },
        (_err) => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
      );
    };

    requestAndGetLocation();
  }, []);

  const reloadMapLocation = useCallback(() => {
    setNearestStation(null);
    Geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setMapKey((k) => k + 1);
      },
      () => {
        setMapKey((k) => k + 1);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }, []);

  // --- Firestore: users/{uid}/reminders/latest ---
  const fetchReminders = useCallback(async () => {
    if (!user?.uid) return;
    setIsFetching(true);
    try {
      const docRef = doc(db, 'users', user.uid, 'reminders', 'latest');

      const docSnap = await getDoc(docRef);

      const snapData = docSnap.data();
      if (snapData) {
        setData({ ...EMPTY_REMINDERS, ...snapData } as RemindersData);
      } else {
        console.log(
          `[FuelFlow] No reminders for UID ${user.uid} — initializing...`,
        );
        await setDoc(docRef, {
          ...EMPTY_REMINDERS,
          lastUpdated: serverTimestamp(),
        });
        setData(EMPTY_REMINDERS);
      }
      setHasPermissionError(false);
    } catch (err: any) {
      if (err?.code === 'firestore/permission-denied') {
        setHasPermissionError(true);
        setData(EMPTY_REMINDERS);
        return;
      }
      console.error('[FuelFlow] Reminders fetch error:', err);
    } finally {
      setIsFetching(false);
      setIsInitialLoad(false);
    }
  }, [db, user?.uid]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const noData = data.fuelLevelPercent === 0 && data.oilLifePercent === 0;

  const oilBadge =
    data.oilLifePercent > 0 && data.oilLifePercent <= 20
      ? { text: t('oil_change_needed'), color: colors.warning }
      : null;

  const fuelBadge =
    data.fuelLevelPercent > 0 && data.fuelLevelPercent <= 15
      ? { text: t('fuel_low'), color: colors.danger }
      : null;
  const scrollContentStyle = styles.scrollContent;
  const noDataBannerColorsStyle = styles.noDataBannerColors;
  const tipsTitleStyle = styles.tipsTitle;

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
          {t('loading_reminders')}
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
        {/* ── Section Header ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('reminders_header')}
          </Text>
          <TouchableOpacity
            style={[styles.refreshBtn, { borderColor: colors.border }]}
            onPress={fetchReminders}
            disabled={isFetching}
          >
            {isFetching ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Icon name="refresh-cw" size={15} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── No data banner ── */}
        {noData && (
          <View
            className="flex-row items-center"
            style={[styles.noBanner, noDataBannerColorsStyle]}
          >
            <Icon name="wifi-off" size={13} color="#F59E0B" />
            <Text style={styles.noBannerText}>
              {hasPermissionError
                ? t('permission_error')
                : t('no_connection_reminders')}
            </Text>
          </View>
        )}

        {/* ── Oil Life Card ── */}
        <StatCard
          label={t('oil_remaining')}
          value={data.oilLifePercent}
          unit="%"
          barColor={colors.warning ?? '#F59E0B'}
          maxValue={100}
          badgeText={oilBadge?.text}
          badgeColor={oilBadge?.color}
          subStats={[
            { label: t('oil_type_label'), value: data.oilType },
            {
              label: t('last_oil_change'),
              value:
                data.lastOilServiceKm > 0 ? `${data.lastOilServiceKm} km` : '—',
            },
          ]}
          colors={colors}
          noData={noData}
        />

        {/* ── Fuel Level Card ── */}
        <StatCard
          label={t('fuel_label')}
          value={data.fuelLevelPercent}
          unit="%"
          barColor={colors.danger ?? '#EF4444'}
          maxValue={100}
          badgeText={fuelBadge?.text}
          badgeColor={fuelBadge?.color}
          subStats={[
            {
              label: t('capacity_label'),
              value: data.tankCapacityL > 0 ? `${data.tankCapacityL} L` : '—',
            },
            {
              label: t('consumption_label'),
              value:
                data.avgConsumption > 0 ? `${data.avgConsumption} L/100` : '—',
            },
          ]}
          colors={colors}
          noData={noData}
        />

        {/* ── Nearest Gas Station Map ── */}
        <View style={styles.mapSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('nearest_station')}
          </Text>
          <View style={styles.mapHeaderRight}>
            {(nearestStation || data.nearestStationKm > 0) && (
              <View
                style={[
                  styles.distanceBadge,
                  { backgroundColor: `${colors.primary}20` },
                ]}
              >
                <Text
                  style={[styles.distanceBadgeText, { color: colors.primary }]}
                >
                  {nearestStation
                    ? nearestStation.dist < 1
                      ? `${(nearestStation.dist * 1000).toFixed(0)} m`
                      : `${nearestStation.dist.toFixed(1)} km`
                    : `${data.nearestStationKm} km`}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.mapRefreshBtn, { borderColor: colors.border }]}
              onPress={reloadMapLocation}
              accessibilityLabel={t('map_refresh')}
            >
              <Icon name="refresh-cw" size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View
          className="overflow-hidden rounded-2xl border"
          style={[styles.mapCard, { borderColor: colors.border }]}
        >
          <WebView
            key={mapKey}
            source={{
              html: buildMapHTML(
                userLocation?.lat ?? data.nearestStationLat,
                userLocation?.lng ?? data.nearestStationLng,
                isDark,
              ),
            }}
            style={styles.mapWebView}
            scrollEnabled
            nestedScrollEnabled
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            allowsInlineMediaPlayback
            onMessage={(event) => {
              try {
                const msg = JSON.parse(event.nativeEvent.data);
                if (msg.type === 'stations_loaded') {
                  setNearestStation({
                    name: msg.nearest.name,
                    dist: msg.nearest.dist,
                    count: msg.count,
                  });
                }
              } catch {}
            }}
          />
          <View
            style={[
              styles.mapFooter,
              {
                backgroundColor: colors.cardBackground,
                borderTopColor: colors.border,
              },
            ]}
          >
            <Icon
              name="map-pin"
              size={14}
              color={nearestStation ? '#22C55E' : (colors.danger ?? '#EF4444')}
            />
            <Text
              style={[styles.mapFooterText, { color: colors.text }]}
              numberOfLines={1}
            >
              {nearestStation
                ? `${nearestStation.name} · ${
                    nearestStation.dist < 1
                      ? `${(nearestStation.dist * 1000).toFixed(0)} m`
                      : `${nearestStation.dist.toFixed(1)} km`
                  }`
                : t('nearest_station')}
            </Text>
            {nearestStation && (
              <Text style={[styles.stationCount, { color: colors.textSecondary }]}>
                {nearestStation.count} found
              </Text>
            )}
          </View>
        </View>

        {/* ── Next Service ── */}
        <View
          style={[
            styles.nextServiceCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View>
            <Text
              style={[styles.nextServiceLabel, { color: colors.textSecondary }]}
            >
              {t('next_service')}
            </Text>
            <Text
              style={[
                styles.nextServiceValue,
                { color: noData ? colors.textSecondary : colors.text },
              ]}
            >
              {noData
                ? '—'
                : `${
                    data.nextServiceKm > 0 ? `${data.nextServiceKm} km` : '—'
                  } / ${data.nextServiceDate}`}
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.textSecondary} />
        </View>

        {/* ── Tips ── */}
        <View style={styles.tipsSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textSecondary },
              tipsTitleStyle,
            ]}
          >
            {t('tips_header')}
          </Text>
          {[
            t('tip_1'),
            t('tip_2'),
            t('tip_3'),
            t('tip_4'),
            t('tip_5'),
            t('tip_6'),
          ].map((tip, i) => (
            <View
              key={i}
              style={[styles.tipRow, { borderBottomColor: colors.border }]}
            >
              <View
                style={[
                  styles.tipDot,
                  { backgroundColor: colors.warning ?? '#F59E0B' },
                ]}
              />
              <Text style={[styles.tipText, { color: colors.text }]}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: { fontSize: 13, fontWeight: '500' },
  noDataBannerColors: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.2)',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  noBannerText: { color: '#F59E0B', fontSize: 12, fontWeight: '500', flex: 1 },

  mapSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 10,
  },
  distanceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  distanceBadgeText: { fontSize: 11, fontWeight: '700' },

  mapHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapRefreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    height: 320,
  },
  mapWebView: { flex: 1, backgroundColor: 'transparent' },
  mapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  mapFooterText: { fontSize: 12, fontWeight: '600', flex: 1 },
  stationCount: { fontSize: 11, fontWeight: '600' },

  nextServiceCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  nextServiceLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  nextServiceValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Courier New',
  },

  tipsSection: { marginTop: 4 },
  tipsTitle: { marginBottom: 10 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  tipText: { fontSize: 13, lineHeight: 19, flex: 1 },
});

export default RemindersScreen;
