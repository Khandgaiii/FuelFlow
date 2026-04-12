import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import MCI from 'react-native-vector-icons/MaterialCommunityIcons';
import { SettingsTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization, Language } from '../context/LocalizationContext';
import { useMetricUnits } from '../context/MetricUnitsContext';
import { AppHeader } from '../navigation/RootNavigator';
import { useAuth } from '../context/AuthContext';

const ORANGE = '#F97316';

// ─── Toggle ──────────────────────────────────────────────────────────────────
interface ToggleProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  activeColor?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  value,
  onValueChange,
  activeColor = ORANGE,
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onValueChange(!value)}
      style={[
        S.toggle,
        { backgroundColor: value ? activeColor : colors.border },
      ]}
    >
      <View
        style={[
          S.toggleThumb,
          {
            backgroundColor: '#fff',
            transform: [{ translateX: value ? 20 : 2 }],
          },
        ]}
      />
    </TouchableOpacity>
  );
};

// ─── Row ─────────────────────────────────────────────────────────────────────
interface RowProps {
  icon: string;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  colors: any;
  danger?: boolean;
}

const Row: React.FC<RowProps> = ({
  icon,
  label,
  subtitle,
  right,
  onPress,
  colors,
  danger,
}) => (
  <TouchableOpacity
    style={[S.row, { borderBottomColor: colors.border }]}
    onPress={onPress}
    activeOpacity={onPress ? 0.6 : 1}
    disabled={!onPress}
  >
    <MCI
      name={icon}
      size={20}
      color={danger ? '#EF4444' : colors.textSecondary}
      style={S.rowIcon}
    />
    <View style={S.rowContent}>
      <Text
        style={[S.rowLabel, { color: danger ? '#EF4444' : colors.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {subtitle ? (
        <Text
          style={[S.rowSub, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
    {right ?? null}
  </TouchableOpacity>
);

// ─── Main ────────────────────────────────────────────────────────────────────
const SettingsScreen: React.FC<SettingsTabScreenProps> = ({
  navigation: _navigation,
}) => {
  const { colors } = useTheme();
  const { t, language, setLanguage } = useLocalization();
  const { metricUnits, setMetricUnits } = useMetricUnits();
  const { user, logout } = useAuth();

  const [faultAlerts, setFaultAlerts] = useState(true);
  const [maintenanceReminders, setMaintenanceReminders] = useState(true);
  const [langModal, setLangModal] = useState(false);

  const languages: Array<{ id: Language; label: string; flag: string }> = [
    { id: 'mn', label: 'Монгол', flag: '🇲🇳' },
    { id: 'en', label: 'English', flag: '🇺🇸' },
    { id: 'ja', label: '日本語', flag: '🇯🇵' },
  ];

  const currentLangLabel =
    languages.find(l => l.id === language)?.label ?? language;

  const handleLang = (lang: Language) => {
    setLanguage(lang);
    setLangModal(false);
  };

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      <AppHeader />

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Account ── */}
        <Text style={[S.section, { color: colors.textSecondary }]}>
          {t('account')}
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
          <Row
            icon="account-circle-outline"
            label={user?.displayName || 'User'}
            subtitle={user?.email ?? ''}
            colors={colors}
          />
          <Row
            icon="logout"
            label={t('logout')}
            onPress={logout}
            colors={colors}
            danger
          />
        </View>

        {/* ── Preferences ── */}
        <Text style={[S.section, { color: colors.textSecondary }]}>
          {t('preferences')}
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
          <Row
            icon="translate"
            label={t('language')}
            subtitle={currentLangLabel}
            onPress={() => setLangModal(true)}
            colors={colors}
            right={
              <MCI name="chevron-right" size={20} color={colors.textSecondary} />
            }
          />
          <Row
            icon="ruler"
            label={t('metric_units')}
            subtitle={metricUnits ? 'km/h, L/100km' : 'mph, mpg'}
            colors={colors}
            right={
              <Toggle value={metricUnits} onValueChange={setMetricUnits} />
            }
          />
        </View>

        {/* ── Notifications ── */}
        <Text style={[S.section, { color: colors.textSecondary }]}>
          {t('notifications')}
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
          <Row
            icon="alert-circle-outline"
            label={t('fault_alerts')}
            subtitle={t('fault_notifications')}
            colors={colors}
            right={
              <Toggle value={faultAlerts} onValueChange={setFaultAlerts} />
            }
          />
          <Row
            icon="wrench-outline"
            label={t('maintenance_reminders')}
            subtitle={t('service_notifications')}
            colors={colors}
            right={
              <Toggle
                value={maintenanceReminders}
                onValueChange={setMaintenanceReminders}
              />
            }
          />
        </View>

        <View style={S.bottomSpacer} />
      </ScrollView>

      {/* ── Language Modal ── */}
      <Modal
        visible={langModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModal(false)}
      >
        <Pressable style={S.overlay} onPress={() => setLangModal(false)}>
          <View
            style={[
              S.sheet,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[S.sheetTitle, { color: colors.text }]}>
              {t('language')}
            </Text>
            {languages.map(lang => {
              const selected = lang.id === language;
              return (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    S.langRow,
                    {
                      backgroundColor: selected
                        ? `${ORANGE}18`
                        : 'transparent',
                      borderColor: selected ? ORANGE : colors.border,
                    },
                  ]}
                  onPress={() => handleLang(lang.id)}
                  activeOpacity={0.7}
                >
                  <Text style={S.langFlag}>{lang.flag}</Text>
                  <Text
                    style={[
                      S.langLabel,
                      { color: selected ? ORANGE : colors.text },
                    ]}
                  >
                    {lang.label}
                  </Text>
                  {selected && <MCI name="check" size={20} color={ORANGE} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[S.sheetClose, { backgroundColor: ORANGE }]}
              onPress={() => setLangModal(false)}
            >
              <Text style={S.sheetCloseText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const S = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  section: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { marginRight: 14 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },

  // Toggle
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  bottomSpacer: { height: 20 },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: '82%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  langFlag: { fontSize: 22 },
  langLabel: { fontSize: 16, fontWeight: '600', flex: 1 },
  sheetClose: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  sheetCloseText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  bleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SettingsScreen;
