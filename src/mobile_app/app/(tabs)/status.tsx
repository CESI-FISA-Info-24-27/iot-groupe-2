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
import { useSensorData } from '@/hooks/useSensorData';

const SENSOR_TIMEOUT = 5000;

export default function StatusScreen() {
  const backend = useBackendHealth();
  const sensors = useSensorData();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([backend.refresh(), sensors.refresh()]);
    setRefreshing(false);
  };

  const now = Date.now();
  const lastTimestamp = sensors.data?.timestamp ?? 0;
  const offline = now - lastTimestamp > SENSOR_TIMEOUT;


  const buildSensorStatus = (
    label: string,
    isOffline: boolean,
    errorMessage: string | null
  ) => {
    if (isOffline) return { label, status: 'OFFLINE', message: 'Aucune donnée reçue' };
    if (errorMessage) return { label, status: 'ERROR', message: errorMessage };
    return { label, status: 'OK', message: 'Fonctionnement normal' };
  };

 const temperature = sensors.data?.temperature;
 const pressure = sensors.data?.pressure;

let tempPressureError: string | null = null;

if (temperature != null && (temperature < -40 || temperature > 125)) {
  tempPressureError = 'Température hors plage';
} else if (pressure != null && pressure <= 0) {
  tempPressureError = 'Pression invalide';
}


  const sensorStatuses = [
    buildSensorStatus('Température & Pression', offline, tempPressureError),

    buildSensorStatus(
      'Distance',
      offline || sensors.data.distance == null,
      sensors.data.distance! < 0 || sensors.data.distance! > 10000
        ? 'Distance hors plage'
        : null
    ),

    buildSensorStatus(
      'Micro',
      offline || sensors.data.sound == null,
      sensors.data.sound! < 0 ? 'Signal micro invalide' : null
    ),

    buildSensorStatus('Caméra', offline, null),
  ];

  const hasError = sensorStatuses.some(s => s.status === 'ERROR');
  const hasOffline = sensorStatuses.some(s => s.status === 'OFFLINE');

  let globalStatus = 'STABLE';
  if (hasError) globalStatus = 'ERREUR SYSTÈME';
  else if (hasOffline) globalStatus = 'CAPTEURS HORS LIGNE';

  const globalColor =
    globalStatus === 'STABLE'
      ? '#10b981'
      : globalStatus === 'ERREUR SYSTÈME'
      ? '#ef4444'
      : '#f59e0b';

  const backendStatus = backend.data?.status ?? 'unknown';
  const services = backend.data?.services ?? {};

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <Text style={styles.kicker}>Connectivity</Text>
        <Text style={styles.title}>Status du système</Text>
        <Text style={styles.subtitle}>
          Santé des capteurs, backend et services.
        </Text>
      </View>

      {backend.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {backend.error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* GLOBAL */}
        <View style={[styles.statusCard, { borderColor: globalColor }]}>
          <Text style={styles.statusLabel}>État global système</Text>
          <Text style={[styles.statusValue, { color: globalColor }]}>
            {globalStatus}
          </Text>
        </View>

        {/* SENSORS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Capteurs</Text>
          <Text style={styles.sectionSubtitle}>Diagnostic individuel</Text>
        </View>

        {sensorStatuses.map((s, i) => {
          const color =
            s.status === 'OK'
              ? '#10b981'
              : s.status === 'ERROR'
              ? '#ef4444'
              : '#f59e0b';

          return (
            <View key={i} style={[styles.statusCard, { borderColor: color }]}>
              <Text style={styles.statusLabel}>{s.label}</Text>
              <Text style={[styles.statusValue, { color }]}>{s.status}</Text>
              <Text style={styles.statusHint}>{s.message}</Text>
            </View>
          );
        })}

        {/* BACKEND */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Backend</Text>
          <Text style={styles.sectionSubtitle}>État de l’API</Text>
        </View>

        <View style={[styles.statusCard, { borderColor: '#38bdf8' }]}>
          <Text style={styles.statusValue}>{backendStatus.toUpperCase()}</Text>
          <Text style={styles.statusHint}>Endpoint: {API_ENDPOINTS.health}</Text>
        </View>

        {/* SERVICES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services</Text>
          <Text style={styles.sectionSubtitle}>MQTT & InfluxDB</Text>
        </View>

        <View style={styles.serviceGrid}>
          <ServicePill label="MQTT" value={services.mqtt ?? 'unknown'} />
          <ServicePill label="InfluxDB" value={services.influxdb ?? 'unknown'} isLast />
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

/* ================== TES STYLES ORIGINAUX INCHANGÉS ================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220' },
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
  },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 6 },
  content: { padding: 20 },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 10,
  },
  errorText: { color: '#fecaca', fontSize: 13, textAlign: 'center' },
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
  statusValue: { fontSize: 24, fontWeight: '800', marginTop: 6 },
  statusHint: { color: '#64748b', fontSize: 12, marginTop: 6 },
  sectionHeader: { marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#e2e8f0' },
  sectionSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  serviceGrid: { flexDirection: 'row', marginBottom: 16 },
  servicePill: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginRight: 12,
  },
  servicePillLast: { marginRight: 0 },
  serviceLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  serviceValue: { fontSize: 18, fontWeight: '700', marginTop: 6 },
});
