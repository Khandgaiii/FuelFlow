import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Icon } from '../components/Icon';
import { RemindersTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { AppHeader } from '../navigation/RootNavigator';

// Static reminder data
const OIL_LIFE_PERCENT = 15;
const OIL_SERVICE_KM = 800;
const OIL_TYPE = '5W-30 Synthetic';
const LAST_OIL_SERVICE_KM = 12400;

const FUEL_LEVEL_PERCENT = 10;
const FUEL_RANGE_KM = 45;
const TANK_CAPACITY_L = 60;
const AVG_CONSUMPTION = 8.2;
const NEAREST_STATION_KM = 2.3;
const NEAREST_STATION_NAME = 'Shell - Main Street & 5th Ave';

interface ReminderCardProps {
  title: string;
  icon: React.ReactNode;
  value: number;
  unit: string;
  progressColor: string;
  alertColor: string;
  alertBadge: string;
  details: Array<{ label: string; value: string }>;
  bottomInfo?: { icon: React.ReactNode; title: string; subtitle: string };
  actionText: string;
}

const ReminderCard: React.FC<ReminderCardProps> = ({
  title,
  icon,
  value,
  unit,
  progressColor,
  alertColor,
  alertBadge,
  details,
  bottomInfo,
  actionText,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
      ]}
    >
      {/* Top color bar */}
      <View style={[styles.cardTopBar, { backgroundColor: progressColor }]} />

      {/* Card header with title and badge */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${progressColor}20` },
            ]}
          >
            {typeof icon === 'string' ? (
              <Text style={styles.mainIcon}>{icon}</Text>
            ) : (
              <View style={{ opacity: 0.7 }}>
                {icon}
              </View>
            )}
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: `${alertColor}20`, borderColor: `${alertColor}40` },
          ]}
        >
          <Text style={[styles.badgeText, { color: alertColor }]}>
            {alertBadge}
          </Text>
        </View>
      </View>

      {/* Percentage display */}
      <View style={styles.percentageSection}>
        <Text style={[styles.percentageValue, { color: alertColor }]}>
          {value}
        </Text>
        <Text style={[styles.percentageUnit, { color: `${alertColor}99` }]}>
          {unit}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarBackground,
            { backgroundColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              { backgroundColor: progressColor, width: `${value}%` },
            ]}
          />
        </View>
      </View>

      {/* Main action text */}
      <View style={styles.actionSection}>
        <Text style={[styles.actionIcon, { color: alertColor }]}>⚠️</Text>
        <Text style={[styles.actionText, { color: alertColor }]}>
          {actionText}
        </Text>
        <Text style={[styles.chevron, { color: colors.textSecondary }]}>
          ›
        </Text>
      </View>

      {/* Detail grid */}
      <View style={styles.detailGrid}>
        {details.map((detail, index) => (
          <View
            key={index}
            style={[
              styles.detailBox,
              { backgroundColor: colors.border + '30' },
            ]}
          >
            <Text
              style={[
                styles.detailLabel,
                { color: colors.textSecondary },
              ]}
            >
              {detail.label}
            </Text>
            <Text
              style={[
                styles.detailValue,
                { color: colors.text },
              ]}
            >
              {detail.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Bottom info box (optional) */}
      {bottomInfo && (
        <View
          style={[
            styles.bottomInfoBox,
            { backgroundColor: `${alertColor}15`, borderColor: `${alertColor}30` },
          ]}
        >
          <View style={styles.bottomInfoIcon}>
            {typeof bottomInfo.icon === 'string' ? (
              <Text style={{ fontSize: 20 }}>{bottomInfo.icon}</Text>
            ) : (
              bottomInfo.icon
            )}
          </View>
          <View style={styles.bottomInfoContent}>
            <Text
              style={[
                styles.bottomInfoTitle,
                { color: colors.text },
              ]}
            >
              {bottomInfo.title}
            </Text>
            <Text
              style={[
                styles.bottomInfoSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              {bottomInfo.subtitle}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const RemindersScreen: React.FC<RemindersTabScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLocalization();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader vehicleName="FuelFlow" />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Icon name="calendar-clock" size={18} color={colors.primary} style={{ marginRight: 12 }} />
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textSecondary },
            ]}
          >
            {t('reminders_title')}
          </Text>
        </View>

        {/* Oil Life Card */}
        <ReminderCard
          title={t('oil_life_remaining')}
          icon={<Icon name="droplets" size={24} color={colors.warning} />}
          value={OIL_LIFE_PERCENT}
          unit="%"
          progressColor={colors.warning}
          alertColor={colors.warning}
          alertBadge={t('service_soon')}
          details={[
            { label: t('oil_type'), value: OIL_TYPE },
            { label: t('last_service'), value: `${LAST_OIL_SERVICE_KM} km ago` },
          ]}
          actionText={`${t('detected')}: ${OIL_SERVICE_KM} km`}
        />

        {/* Fuel Level Card */}
        <ReminderCard
          title={t('refuel_reminder')}
          icon={<Icon name="zap" size={24} color={colors.danger} />}
          value={FUEL_LEVEL_PERCENT}
          unit="%"
          progressColor={colors.danger}
          alertColor={colors.danger}
          alertBadge={t('low_fuel')}
          details={[
            { label: t('tank_capacity'), value: `${TANK_CAPACITY_L} L` },
            { label: t('avg_consumption'), value: `${AVG_CONSUMPTION} L/100km` },
          ]}
          bottomInfo={{
            icon: <Icon name="map-pin" size={20} color={colors.danger} />,
            title: `${t('nearest_station')}: ${NEAREST_STATION_KM} km`,
            subtitle: NEAREST_STATION_NAME,
          }}
          actionText={`${t('detected')}: ${FUEL_RANGE_KM} km`}
        />

        {/* Upcoming Maintenance */}
        <TouchableOpacity
          style={[
            styles.upcomingCard,
            { backgroundColor: colors.cardBackground + '80', borderColor: colors.border },
          ]}
        >
          <View style={styles.upcomingContent}>
            <Text style={[styles.upcomingLabel, { color: colors.textSecondary }]}>
              {t('next_scheduled_service')}
            </Text>
            <Text style={[styles.upcomingValue, { color: colors.text }]}>
              15,000 km / Mar 2026
            </Text>
          </View>
          <Text style={[styles.upcomingChevron, { color: colors.textSecondary }]}>
            ›
          </Text>
        </TouchableOpacity>

        {/* Additional tips section */}
        <View style={styles.tipsSection}>
          <Text
            style={[
              styles.tipsTitle,
              { color: colors.textSecondary },
            ]}
          >
            {t('tips_fuel_efficiency')}
          </Text>
          <View style={[styles.tipItem, { borderColor: colors.border }]}>
            <Icon name="info" size={16} color={colors.warning} style={{ marginRight: 10 }} />
            <Text style={[styles.tipText, { color: colors.text }]}>
              {t('tip_tire_pressure')}
            </Text>
          </View>
          <View style={[styles.tipItem, { borderColor: colors.border }]}>
            <Icon name="info" size={16} color={colors.warning} style={{ marginRight: 10 }} />
            <Text style={[styles.tipText, { color: colors.text }]}>
              {t('tip_cargo')}
            </Text>
          </View>
          <View style={[styles.tipItem, { borderColor: colors.border }]}>
            <Icon name="info" size={16} color={colors.warning} style={{ marginRight: 10 }} />
            <Text style={[styles.tipText, { color: colors.text }]}>
              {t('tip_acceleration')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default RemindersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    padding: 16,
  },
  cardTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    marginTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mainIcon: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  percentageSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  percentageValue: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'Courier New',
  },
  percentageUnit: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 4,
    fontFamily: 'Courier New',
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '300',
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  detailBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Courier New',
  },
  bottomInfoBox: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  bottomInfoIcon: {
    fontSize: 20,
    marginRight: 10,
    justifyContent: 'center',
  },
  bottomInfoContent: {
    flex: 1,
  },
  bottomInfoTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  bottomInfoSubtitle: {
    fontSize: 11,
  },
  upcomingCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  upcomingValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Courier New',
  },
  upcomingChevron: {
    fontSize: 18,
    marginLeft: 8,
  },
  tipsSection: {
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tipText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
