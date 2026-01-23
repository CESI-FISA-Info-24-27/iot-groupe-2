// components/SensorCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SensorConfig } from '@/types/sensors';

interface SensorCardProps {
  config: SensorConfig;
  value: number | null;
  timestamp: number;
}

export const SensorCard: React.FC<SensorCardProps> = ({ config, value, timestamp }) => {
  const getStatus = () => {
    if (value === null) return 'offline';
    if (config.criticalThreshold && value >= config.criticalThreshold) return 'critical';
    if (config.warningThreshold && value >= config.warningThreshold) return 'warning';
    return 'normal';
  };

  const status = getStatus();
  const statusColors = {
    normal: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
    offline: '#6b7280',
  };

  const getLastUpdate = () => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 5) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff}s`;
    return `Il y a ${Math.floor(diff / 60)}m`;
  };

  return (
    <View style={[styles.card, { borderLeftColor: statusColors[status] }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{config.icon}</Text>
        <Text style={styles.name}>{config.name}</Text>
      </View>
      
      <View style={styles.valueContainer}>
        {value === null ? (
          <Text style={styles.offline}>Hors ligne</Text>
        ) : (
          <>
            <Text style={styles.value}>{value.toFixed(1)}</Text>
            <Text style={styles.unit}>{config.unit}</Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
        <Text style={styles.lastUpdate}>{getLastUpdate()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  value: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  unit: {
    fontSize: 18,
    color: '#9ca3af',
    marginLeft: 6,
  },
  offline: {
    fontSize: 18,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#9ca3af',
  },
});