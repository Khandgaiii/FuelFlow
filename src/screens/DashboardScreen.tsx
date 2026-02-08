import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
} from 'react-native';
import { Icon } from '../components/Icon';
import { DashboardTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useMetricUnits } from '../context/MetricUnitsContext';
import { RadialGauge } from '../components/RadialGauge';
import { VehicleStatus } from '../components/VehicleStatus';
import { AppHeader } from '../navigation/RootNavigator';
import { dashboardData, MAX_SPEED, MAX_RPM, MAX_FUEL_CONSUMPTION, MAX_THROTTLE } from '../constants/mockData';

const DashboardScreen: React.FC<DashboardTabScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { metricUnits } = useMetricUnits();

  // Convert speed from KM/H to MPH if metric units are off
  const displaySpeed = metricUnits 
    ? dashboardData.speed 
    : Math.round(dashboardData.speed * 0.621371);
  const speedUnit = metricUnits ? 'km/h' : 'mph';
  const maxSpeed = metricUnits ? 240 : 150;
  
  // Fuel consumption conversion
  const fuelUnit = metricUnits ? 'L/100km' : 'mpg';
  const displayFuel = metricUnits ? dashboardData.fuelConsumption : Math.round(235.215 / dashboardData.fuelConsumption);
  const maxFuel = metricUnits ? 25 : 60;

  // Get status color based on metric
  const getBatteryColor = (value: number) => {
    if (value >= 12.4) return colors.success;
    if (value >= 12.0) return colors.warning;
    return colors.danger;
  };

  const getCoolantColor = (value: number) => {
    if (value <= 95) return colors.success;
    if (value <= 105) return colors.warning;
    return colors.danger;
  };

  const getOilColor = (value: number) => {
    if (value >= 25) return colors.success;
    return colors.danger;
  };

  const getEngineLoadColor = (value: number) => {
    if (value <= 70) return colors.success;
    if (value <= 85) return colors.warning;
    return colors.danger;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader vehicleName="FuelFlow" />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
      {/* Real-Time Performance - Main Gauges */}
      <View style={[styles.mainCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusIndicator, { backgroundColor: colors.primary }]} />
          <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>
            {t('realtime_performance')}
          </Text>
        </View>

        <View style={styles.gaugesRow}>
          <View style={styles.gaugeWrapper}>
            <RadialGauge
              value={displaySpeed}
              maxValue={maxSpeed}
              label={t('speed')}
              unit={speedUnit}
              ringColor={colors.cyan}
              size="sm"
            />
          </View>
          <View style={styles.gaugeWrapper}>
            <RadialGauge
              value={dashboardData.rpm}
              maxValue={MAX_RPM}
              label={t('rpm')}
              unit="x1000"
              ringColor={colors.green}
              size="sm"
            />
          </View>
        </View>
      </View>

      {/* Secondary Metrics */}
      <View style={styles.spacer} />

      {/* Fuel Consumption Bar */}
      <View style={[styles.metricCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.metricHeader}>
          <Text style={[styles.metricLabel, { color: colors.text }]}>
            {t('fuel_consumption')}
          </Text>
          <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>
            {fuelUnit}
          </Text>
        </View>
        <View style={styles.metricValue}>
          <Text style={[styles.largeValue, { color: colors.text }]}>
            {displayFuel}
          </Text>
        </View>
        <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.teal,
                width: `${(displayFuel / maxFuel) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Throttle Position Bar */}
      <View style={[styles.metricCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.metricHeader}>
          <Text style={[styles.metricLabel, { color: colors.text }]}>
            {t('throttle_position')}
          </Text>
          <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>
            %
          </Text>
        </View>
        <View style={styles.metricValue}>
          <Text style={[styles.largeValue, { color: colors.text }]}>
            {dashboardData.throttlePosition}
          </Text>
        </View>
        <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.teal,
                width: `${(dashboardData.throttlePosition / MAX_THROTTLE) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.spacer} />

      <View style={styles.statsSection}>
        <Text style={[styles.statsSectionTitle, { color: colors.textSecondary }]}>
          System Status
        </Text>
        <VehicleStatus
          items={[
            {
              icon: <Icon name="zap" size={24} color={colors.success} />,
              label: t('battery'),
              value: `${dashboardData.battery.toFixed(1)}V`,
              status: dashboardData.battery >= 12.4 ? 'good' : dashboardData.battery >= 12.0 ? 'warning' : 'critical',
              color: colors.success,
            },
            {
              icon: <Icon name="thermometer" size={24} color={colors.success} />,
              label: t('coolant'),
              value: `${dashboardData.coolant}°C`,
              status: dashboardData.coolant <= 95 ? 'good' : dashboardData.coolant <= 105 ? 'warning' : 'critical',
              color: colors.success,
            },
            {
              icon: <Icon name="droplets" size={24} color={colors.success} />,
              label: t('oil_pressure'),
              value: `${dashboardData.oilPressure} PSI`,
              status: dashboardData.oilPressure >= 25 ? 'good' : dashboardData.oilPressure >= 15 ? 'warning' : 'critical',
              color: colors.success,
            },
            {
              icon: <Icon name="power" size={24} color={colors.success} />,
              label: t('engine_load'),
              value: `${dashboardData.engineLoad}%`,
              status: dashboardData.engineLoad <= 75 ? 'good' : dashboardData.engineLoad <= 90 ? 'warning' : 'critical',
              color: colors.success,
            },
          ]}
          colors={colors}
        />
      </View>

      {/* Bottom Padding */}
      <View style={{ height: 40 }} />
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  mainCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  gaugesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  gaugeWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  spacer: {
    height: 8,
  },
  metricCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    marginBottom: 12,
  },
  largeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
});

export default DashboardScreen;
