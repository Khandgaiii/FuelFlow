import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Switch,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { SettingsTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization, Language } from '../context/LocalizationContext';
import { useMetricUnits } from '../context/MetricUnitsContext';
import { AppHeader } from '../navigation/RootNavigator';
import { Card } from '../components/UIComponents';
import { useAuth } from '../context/AuthContext';

const SettingsScreen: React.FC<SettingsTabScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t, language, setLanguage } = useLocalization();
  const { metricUnits, setMetricUnits } = useMetricUnits();
  
  // 2. Access the Firebase user and logout function
  const { user, logout } = useAuth();
  const [faultAlerts, setFaultAlerts] = useState(true);
  const [maintenanceReminders, setMaintenanceReminders] = useState(true);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const languages: Array<{ id: Language; label: string }> = [
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Español' },
    { id: 'mn', label: 'Монгол' },
  ];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setLanguageModalVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader vehicleName="FuelFlow" />
      {/* Account Section */}
<Text style={[styles.sectionHeader, { color: colors.text, marginTop: 16 }]}>
  {t('account') || 'Account'}
</Text>

<Card style={[styles.settingCard, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
  <View style={styles.settingRow}>
    <View style={styles.settingInfo}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>
        {user?.displayName || 'User'}
      </Text>
      <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
        {user?.email}
      </Text>
    </View>
    <TouchableOpacity 
      onPress={logout}
      style={[styles.logoutButton, { backgroundColor: colors.error || '#FF4444' }]}
    >
      <Text style={styles.logoutText}>{t('logout') || 'Logout'}</Text>
    </TouchableOpacity>
  </View>
</Card>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Preferences Section */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>
        {t('preferences')}
      </Text>

      {/* Language Setting */}
      <Card style={[styles.settingCard, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {t('language')}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              {languages.find(l => l.id === language)?.label || language}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setLanguageModalVisible(true)}
            style={styles.settingControl}
          >
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Metric Units Toggle */}
      <Card style={[styles.settingCard, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {t('metric_units')}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              {metricUnits ? 'km/h, L/100km' : 'mph, mpg'}
            </Text>
          </View>
          <Switch
            style={styles.settingControl}
            value={metricUnits}
            onValueChange={setMetricUnits}
            trackColor={{
              false: colors.border,
              true: colors.primary,
            }}
            thumbColor={metricUnits ? colors.primary : colors.textSecondary}
          />
        </View>
      </Card>

      {/* Notifications Section */}
      <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 32 }]}>
        {t('notifications')}
      </Text>

      {/* Fault Alerts Toggle */}
      <Card style={[styles.settingCard, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {t('fault_alerts')}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              {t('fault_notifications')}
            </Text>
          </View>
          <Switch
            style={styles.settingControl}
            value={faultAlerts}
            onValueChange={setFaultAlerts}
            trackColor={{
              false: colors.border,
              true: colors.primary,
            }}
            thumbColor={faultAlerts ? colors.primary : colors.textSecondary}
          />
        </View>
      </Card>

      {/* Maintenance Reminders Toggle */}
      <Card style={[styles.settingCard, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {t('maintenance_reminders')}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              {t('service_notifications')}
            </Text>
          </View>
          <Switch
            style={styles.settingControl}
            value={maintenanceReminders}
            onValueChange={setMaintenanceReminders}
            trackColor={{
              false: colors.border,
              true: colors.primary,
            }}
            thumbColor={maintenanceReminders ? colors.primary : colors.textSecondary}
          />
        </View>
      </Card>

      {/* Connection Section */}
      <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 32 }]}>
        {t('connection')}
      </Text>

      <Card style={[styles.settingCard, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            {t('obd_protocol')}
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {t('can_protocol')}
          </Text>
        </View>
        
        <View style={[styles.infoDivider, { borderColor: colors.border }]} />
        
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            {t('device')}
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {t('elm_device')}
          </Text>
        </View>

        <View style={[styles.infoDivider, { borderColor: colors.border }]} />
        
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            {t('signal_strength')}
          </Text>
          <Text style={[styles.infoValue, { color: colors.success }]}>
            ● {t('signal_excellent')}
          </Text>
        </View>
      </Card>

      {/* About Section */}
      <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 32 }]}>
        {t('about')}
      </Text>

      <Card style={[styles.settingCard, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            {t('app_version')}
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            2.1.0
          </Text>
        </View>

        <View style={[styles.infoDivider, { borderColor: colors.border }]} />

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            Database
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            OBD-II 2026.1
          </Text>
        </View>
      </Card>

      {/* Bottom Spacing */}
      <View style={{ height: 40 }} />

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Card
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('language')}
            </Text>

            <FlatList
              data={languages}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    language === item.id 
                      ? { backgroundColor: colors.primary } 
                      : { backgroundColor: colors.border },
                  ]}
                  onPress={() => handleLanguageChange(item.id)}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      {
                        color:
                          language === item.id ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              onPress={() => setLanguageModalVisible(false)}
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>
                Close
              </Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Modal>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    paddingRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '400',
  },
  settingValue: {
    fontSize: 13,
    marginTop: 4,
  },
  settingControl: {
    marginLeft: 12,
  },
  chevron: {
    fontSize: 28,
    fontWeight: '300',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Courier New',
  },
  infoDivider: {
    height: 0.5,
    borderTopWidth: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  languageOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 8,
},
logoutText: {
  color: '#FFFFFF',
  fontWeight: '600',
  fontSize: 14,
},
});

export default SettingsScreen;
