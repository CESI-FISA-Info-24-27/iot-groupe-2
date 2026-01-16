// app/(tabs)/index.tsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SensorCard } from '@/components/SensorCard';
import { useSensorData } from '@/hooks/useSensorData';
import { SENSOR_CONFIGS } from '@/constants/config';

export default function DashboardScreen() {
  const { data, loading, error, refresh } = useSensorData();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard CESIoT</Text>
        <Text style={styles.subtitle}>Surveillance en temps réel</Text>
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
            tintColor="#60a5fa"
            colors={['#60a5fa']}
          />
        }
      >
        {loading && !data.temperature && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={styles.loadingText}>Chargement des données...</Text>
          </View>
        )}

        {!loading && (
          <>
            <SensorCard
              config={SENSOR_CONFIGS.temperature}
              value={data.temperature}
              timestamp={data.timestamp}
            />
            <SensorCard
              config={SENSOR_CONFIGS.pressure}
              value={data.pressure}
              timestamp={data.timestamp}
            />
            <SensorCard
              config={SENSOR_CONFIGS.distance}
              value={data.distance}
              timestamp={data.timestamp}
            />
            <SensorCard
              config={SENSOR_CONFIGS.sound}
              value={data.sound}
              timestamp={data.timestamp}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#fca5a5',
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
    color: '#9ca3af',
    marginTop: 16,
    fontSize: 14,
  },
});