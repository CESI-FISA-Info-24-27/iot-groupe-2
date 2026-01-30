// components/SensorCard.tsx
import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
    <View style={[styles.card, { borderColor: statusColors[status] }]}>
      <View style={[styles.glow, { backgroundColor: `${statusColors[status]}22` }]} />
      <MaterialCommunityIcons
        name={config.icon}
        size={48}
        color="#ffffff"
        style={styles.watermark}
      />
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={config.icon} size={22} color="#e2e8f0" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{config.name}</Text>
          <View style={[styles.badge, { backgroundColor: `${statusColors[status]}22` }]}>
            <Text style={[styles.badgeText, { color: statusColors[status] }]}>
              {status}
            </Text>
          </View>
        </View>
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
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#0b1220',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 4,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 999,
  },
  watermark: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    fontSize: 42,
    opacity: 0.1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
    fontFamily: Platform.select({
      ios: 'Avenir Next',
      android: 'sans-serif-medium',
      default: 'System',
    }),
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  value: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f8fafc',
    fontFamily: Platform.select({
      ios: 'Avenir Next',
      android: 'sans-serif',
      default: 'System',
    }),
  },
  unit: {
    fontSize: 18,
    color: '#94a3b8',
    marginLeft: 6,
  },
  offline: {
    fontSize: 18,
    color: '#64748b',
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
    color: '#94a3b8',
  },
});
