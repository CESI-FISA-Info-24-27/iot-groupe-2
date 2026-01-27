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

export default function StatusScreen() {
  const { data, loading, error, refresh } = useBackendHealth();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const status = data?.status ?? 'unknown';
  const services = data?.services ?? {};

  const statusColor =
    status === 'healthy'
      ? '#10b981'
      : status === 'degraded'
        ? '#f59e0b'
        : '#ef4444';

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
            tintColor="#60a5fa"
            colors={['#60a5fa']}
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
          <ServicePill
            label="MQTT"
            value={services.mqtt ?? 'unknown'}
          />
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
  const normalized = value.toLowerCase();
  const color =
    normalized === 'up' ? '#10b981' : normalized === 'down' ? '#ef4444' : '#64748b';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
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
    backgroundColor: '#1d4ed8',
    opacity: 0.25,
    borderRadius: 999,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#38bdf8',
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 6,
    fontFamily: Platform.select({
      ios: 'Avenir Next',
      android: 'sans-serif-medium',
      default: 'System',
    }),
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 6,
  },
  content: {
    padding: 20,
  },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 10,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusLabel: {
    color: '#94a3b8',
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
    color: '#64748b',
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
    color: '#e2e8f0',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  serviceGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  servicePill: {
    flex: 1,
    backgroundColor: '#0f172a',
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
    color: '#94a3b8',
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
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  tipTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  tipText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
});
