import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
} from 'react-native';
import { Icon } from '../components/Icon';
import { DiagnosticsTabScreenProps } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { AppHeader } from '../navigation/RootNavigator';
import { diagnosticsData } from '../constants/mockData';

const DiagnosticsScreen: React.FC<DiagnosticsTabScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLocalization();

  const criticalCount = diagnosticsData.faultCodes.filter(f => f.severity === 'critical').length;
  const warningCount = diagnosticsData.faultCodes.filter(f => f.severity === 'warning').length;
  const totalFaults = diagnosticsData.faultCodes.length;

  const getSeverityBgColor = (severity: string) => {
    return severity === 'critical' ? colors.danger : colors.warning;
  };

  const getSeverityBgWithOpacity = (severity: string) => {
    return severity === 'critical' 
      ? `${colors.danger}20` 
      : `${colors.warning}20`;
  };

  const getIconStyles = (severity: string) => {
    return {
      backgroundColor: getSeverityBgWithOpacity(severity),
      borderColor: getSeverityBgColor(severity),
    };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader vehicleName="FuelFlow" />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryTitleContainer}>
            <Icon name="shield" size={24} color={colors.primary} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              {t('diagnostics_title')}
            </Text>
          </View>
        </View>

        <View style={styles.summaryStats}>
          {/* Critical Stat */}
          <View style={[styles.statBox, { 
            backgroundColor: `${colors.danger}10`,
            borderColor: `${colors.danger}20`,
          }]}>
            <Text style={[styles.statNumber, { color: colors.danger }]}>
              {criticalCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.danger }]}>
              {t('critical')}
            </Text>
          </View>

          {/* Warning Stat */}
          <View style={[styles.statBox, { 
            backgroundColor: `${colors.warning}10`,
            borderColor: `${colors.warning}20`,
          }]}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>
              {warningCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.warning }]}>
              {t('warnings')}
            </Text>
          </View>

          {/* Total Stat */}
          <View style={[styles.statBox, { 
            backgroundColor: `${colors.success}10`,
            borderColor: `${colors.success}20`,
          }]}>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {totalFaults === 0 ? 'OK' : totalFaults}
            </Text>
            <Text style={[styles.statLabel, { color: colors.success }]}>
              {totalFaults === 0 ? t('status') : t('total')}
            </Text>
          </View>
        </View>
      </View>

      {/* Active Fault Codes Section */}
      <View style={styles.faultSection}>
        <Text style={[styles.faultSectionTitle, { color: colors.textSecondary }]}>
          {t('active_fault_codes')}
        </Text>

        {totalFaults === 0 ? (
          <View style={[styles.noFaultsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Icon name="circle-check" size={48} color={colors.success} style={{ marginBottom: 12 }} />
            <Text style={[styles.noFaultsTitle, { color: colors.text }]}>
              {t('all_systems_normal')}
            </Text>
            <Text style={[styles.noFaultsText, { color: colors.textSecondary }]}>
              {t('no_active_faults')}
            </Text>
          </View>
        ) : (
          diagnosticsData.faultCodes.map((fault) => (
            <View
              key={fault.id}
              style={[
                styles.faultCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  borderTopColor: getSeverityBgColor(fault.severity),
                },
              ]}
            >
              {/* Colored top border */}
              <View
                style={[
                  styles.borderTop,
                  { backgroundColor: getSeverityBgColor(fault.severity) },
                ]}
              />

              {/* Content */}
              <View style={styles.faultContent}>
                <View style={styles.faultIconContainer}>
                  <View style={[styles.faultIcon, getIconStyles(fault.severity)]}>
                    {fault.severity === 'critical' ? (
                      <Icon name="circle-alert" size={20} color={getSeverityBgColor(fault.severity)} />
                    ) : (
                      <Icon name="power-off" size={20} color={getSeverityBgColor(fault.severity)} />
                    )}
                  </View>
                </View>

                <View style={styles.faultInfo}>
                  {/* Code and Badges */}
                  <View style={styles.faultCodeRow}>
                    <Text style={[styles.faultCode, { color: colors.text }]}>
                      {fault.code}
                    </Text>
                    <View style={[styles.severityBadge, { 
                      backgroundColor: getSeverityBgWithOpacity(fault.severity),
                    }]}>
                      <Text style={[styles.badgeText, { color: getSeverityBgColor(fault.severity) }]}>
                        {fault.severity.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={[styles.faultDescription, { color: colors.textSecondary }]}>
                    {t(fault.code) || fault.description}
                  </Text>

                  {/* Timestamp */}
                  <Text style={[styles.faultTimestamp, { color: colors.textSecondary }]}>
                    {t('detected')}: {fault.detectedAt}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Protocol Info Card */}
      <View style={[styles.protocolCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.protocolContent}>
          <Text style={[styles.protocolLabel, { color: colors.textSecondary }]}>
            OBD-II Protocol
          </Text>
          <Text style={[styles.protocolValue, { color: colors.text }]}>
            CAN 500Kbps
          </Text>
        </View>
      </View>

      {/* Bottom Spacing */}
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
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  summaryHeader: {
    marginBottom: 16,
  },
  summaryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  faultSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  faultSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  noFaultsCard: {
    paddingVertical: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noFaultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  noFaultsText: {
    fontSize: 12,
    marginTop: 8,
  },
  faultCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  borderTop: {
    height: 3,
    width: '100%',
  },
  faultContent: {
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  faultIconContainer: {
    justifyContent: 'flex-start',
  },
  faultIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faultInfo: {
    flex: 1,
  },
  faultCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  faultCode: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  faultDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  faultTimestamp: {
    fontSize: 10,
    fontFamily: 'Courier New',
  },
  protocolCard: {
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  protocolContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  protocolLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  protocolValue: {
    fontSize: 11,
    fontFamily: 'Courier New',
    fontWeight: '600',
  },
});

export default DiagnosticsScreen;
