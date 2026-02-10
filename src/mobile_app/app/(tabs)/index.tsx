// app/(tabs)/index.tsx
import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SensorCard } from '@/components/SensorCard';
import { useSensorData } from '@/hooks/useSensorData';
import { SENSOR_CONFIGS } from '@/constants/config';
import { useAppTheme } from '@/constants/theme';

export default function DashboardScreen() {
  const { data, loading, error, refresh } = useSensorData();
  const [refreshing, setRefreshing] = React.useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 720;
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const lastUpdateLabel = () => {
    const diff = Math.floor((Date.now() - data.timestamp) / 1000);
    if (diff < 5) return 'juste maintenant';
    if (diff < 60) return `il y a ${diff}s`;
    return `il y a ${Math.floor(diff / 60)}m`;
  };

  const overallStatus = () => {
    const values = [data.temperature, data.pressure, data.distance, data.sound];
    if (values.every(v => v !== null)) return 'stable';
    if (values.some(v => v !== null)) return 'partiel';
    return 'offline';
  };

  const status = overallStatus();
  const statusColor =
    status === 'stable'
      ? theme.colors.success
      : status === 'partiel'
        ? theme.colors.warning
        : theme.colors.danger;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerGlow} />
        <Text style={styles.kicker}>CesIOT</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Surveillance environnementale en temps réel</Text>
        <View style={styles.headerRow}>
          <View style={[styles.statusPill, { borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
          </View>
          <Text style={styles.timestamp}>Màj {lastUpdateLabel()}</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        {loading && !data.temperature && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Chargement des données...</Text>
          </View>
        )}

        {!loading && (
          <View style={[styles.cards, isWide && styles.cardsWide]}>
            <View style={[styles.cardWrap, isWide && styles.cardHalf]}>
              <SensorCard
                config={SENSOR_CONFIGS.temperature}
                sensorType="temperature"
                value={data.temperature}
                timestamp={data.timestamp}
              />
            </View>
            <View style={[styles.cardWrap, isWide && styles.cardHalf]}>
              <SensorCard
                config={SENSOR_CONFIGS.pressure}
                sensorType="pressure"
                value={data.pressure}
                timestamp={data.timestamp}
              />
            </View>
            <View style={[styles.cardWrap, isWide && styles.cardHalf]}>
              <SensorCard
                config={SENSOR_CONFIGS.distance}
                sensorType="distance"
                value={data.distance}
                timestamp={data.timestamp}
              />
            </View>
            <View style={[styles.cardWrap, isWide && styles.cardHalf]}>
              <SensorCard
                config={SENSOR_CONFIGS.sound}
                sensorType="sound"
                value={data.sound}
                timestamp={data.timestamp}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 64 : 40,
    paddingBottom: 20,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    top: -140,
    left: -120,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
    opacity: theme.isDark ? 0.2 : 0.12,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: theme.colors.accent,
    fontWeight: '700',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: Platform.select({
      ios: 'Avenir Next',
      android: 'sans-serif-medium',
      default: 'System',
    }),
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  timestamp: {
    color: theme.colors.textSubtle,
    fontSize: 12,
  },
  errorBanner: {
    backgroundColor: theme.colors.dangerBg,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  errorText: {
    color: theme.isDark ? '#fecaca' : theme.colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textMuted,
    marginTop: 16,
    fontSize: 14,
  },
  cards: {
    marginTop: 4,
  },
  cardsWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrap: {
    width: '100%',
    marginBottom: 12,
  },
  cardHalf: {
    width: '48%',
  },
  });
