// app/(tabs)/status.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { API_ENDPOINTS } from '@/constants/config';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { useAppTheme } from '@/constants/theme';

export default function StatusScreen() {
  const { data, loading, error, refresh } = useBackendHealth();
  const [refreshing, setRefreshing] = React.useState(false);
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const status = data?.status ?? 'unknown';
  const services = data?.services ?? {};

  const statusColor =
    status === 'healthy'
      ? theme.colors.success
      : status === 'degraded'
        ? theme.colors.warning
        : theme.colors.danger;

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <Text style={styles.kicker}>Connectivity</Text>
        <Text style={styles.title}>Status du backend</Text>
        <Text style={styles.subtitle}>
          Vérifie la communication avec l’API et les services.
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        <View style={[styles.statusCard, { borderColor: statusColor }]}>
          <Text style={styles.statusLabel}>État global</Text>
          <Text style={[styles.statusValue, { color: statusColor }]}>
            {status.toUpperCase()}
          </Text>
          <Text style={styles.statusHint}>
            Endpoint: {API_ENDPOINTS.health}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services</Text>
          <Text style={styles.sectionSubtitle}>MQTT & InfluxDB</Text>
        </View>

        <View style={styles.serviceGrid}>
          <ServicePill label="MQTT" value={services.mqtt ?? 'unknown'} />
          <ServicePill
            label="InfluxDB"
            value={services.influxdb ?? 'unknown'}
            isLast
          />
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Astuce</Text>
          <Text style={styles.tipText}>
            Si l’état reste “unknown”, vérifie que l’API écoute sur 0.0.0.0:3000
            et que ton iPhone est sur le même Wi‑Fi.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ServicePill({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const normalized = value.toLowerCase();
  const color =
    normalized === 'up'
      ? theme.colors.success
      : normalized === 'down'
        ? theme.colors.danger
        : theme.colors.textSubtle;

  return (
    <View
      style={[
        styles.servicePill,
        { borderColor: color },
        isLast && styles.servicePillLast,
      ]}
    >
      <Text style={styles.serviceLabel}>{label}</Text>
      <Text style={[styles.serviceValue, { color }]}>{value}</Text>
    </View>
  );
}

const getStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  hero: {
    paddingTop: Platform.OS === 'ios' ? 64 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 220,
    height: 220,
    backgroundColor: theme.colors.accent,
    opacity: theme.isDark ? 0.25 : 0.12,
    borderRadius: 999,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.accent,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 6,
    fontFamily: Platform.select({
      ios: 'Avenir Next',
      android: 'sans-serif-medium',
      default: 'System',
    }),
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  content: {
    padding: 20,
  },
  errorBanner: {
    backgroundColor: theme.colors.dangerBg,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 10,
  },
  errorText: {
    color: theme.isDark ? '#fecaca' : theme.colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
    fontFamily: Platform.select({
      ios: 'Avenir Next',
      android: 'sans-serif',
      default: 'System',
    }),
  },
  statusHint: {
    color: theme.colors.textSubtle,
    fontSize: 12,
    marginTop: 6,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.colors.textSubtle,
    marginTop: 2,
  },
  serviceGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  servicePill: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginRight: 12,
  },
  servicePillLast: {
    marginRight: 0,
  },
  serviceLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  serviceValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  tipCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tipTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  tipText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  });
