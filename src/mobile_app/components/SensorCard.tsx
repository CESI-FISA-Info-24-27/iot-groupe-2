// components/SensorCard.tsx
import React from "react";
import {
  Platform,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SensorConfig, SensorType } from "@/types/sensors";
import { useAppTheme } from "@/constants/theme";
import { API_ENDPOINTS } from "@/constants/config";

interface SensorCardProps {
  config: SensorConfig;
  sensorType: SensorType;
  value: number | null;
  timestamp: number;
}

export const SensorCard: React.FC<SensorCardProps> = ({
  config,
  sensorType,
  value,
  timestamp,
}) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const [expanded, setExpanded] = React.useState(false);
  const [history, setHistory] = React.useState<number[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const hasLoadedHistory = React.useRef(false);

  const fetchHistory = React.useCallback(async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const url = `${API_ENDPOINTS.sensorsHistory}?metric=${encodeURIComponent(
        sensorType,
      )}&range=6h`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      const rows = Array.isArray(result?.data) ? result.data : [];
      const points = rows
        .map((row: any) => ({
          time: new Date(row?.time).getTime(),
          value: Number(row?.value),
        }))
        .filter(
          (p: { time: number; value: number }) =>
            Number.isFinite(p.time) && Number.isFinite(p.value),
        )
        .sort((a: { time: number }, b: { time: number }) => a.time - b.time);

      const maxPoints = 24;
      let sampled = points;
      if (points.length > maxPoints) {
        const step = Math.ceil(points.length / maxPoints);
        sampled = points.filter((_, idx) => idx % step === 0);
      }

      setHistory(sampled.map((p) => p.value));
      hasLoadedHistory.current = true;
    } catch (err) {
      setHistoryError("Impossible de charger l'historique");
    } finally {
      setHistoryLoading(false);
    }
  }, [sensorType]);

  React.useEffect(() => {
    if (expanded && !hasLoadedHistory.current && !historyLoading) {
      fetchHistory();
    }
  }, [expanded, fetchHistory, historyLoading]);

  const getStatus = () => {
    if (value === null) return "offline";
    if (config.criticalThreshold && value >= config.criticalThreshold)
      return "critical";
    if (config.warningThreshold && value >= config.warningThreshold)
      return "warning";
    return "normal";
  };

  const status = getStatus();
  const statusColors = {
    normal: theme.colors.success,
    warning: theme.colors.warning,
    critical: theme.colors.danger,
    offline: theme.colors.textSubtle,
  };

  const getLastUpdate = () => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 5) return "A l'instant";
    if (diff < 60) return `Il y a ${diff}s`;
    return `Il y a ${Math.floor(diff / 60)}m`;
  };

  const renderHistory = () => {
    if (historyLoading) {
      return (
        <View style={styles.chartLoading}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.chartLoadingText}>Chargement...</Text>
        </View>
      );
    }

    if (historyError) {
      return <Text style={styles.chartEmpty}>{historyError}</Text>;
    }

    if (!history.length) {
      return <Text style={styles.chartEmpty}>Aucun historique</Text>;
    }

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;

    return (
      <View style={styles.chart}>
        {history.map((point, index) => {
          const height = 10 + ((point - min) / range) * 42;
          return (
            <View key={`${sensorType}-${index}`} style={styles.chartBar}>
              <View
                style={[
                  styles.chartBarFill,
                  { height, backgroundColor: statusColors[status] },
                ]}
              />
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Pressable
      onPress={() => setExpanded((prev) => !prev)}
      style={({ pressed }) => [
        styles.card,
        { borderColor: statusColors[status] },
        pressed && styles.cardPressed,
      ]}
    >
      <View
        style={[styles.glow, { backgroundColor: `${statusColors[status]}22` }]}
      />
      <MaterialCommunityIcons
        name={config.icon}
        size={48}
        color={theme.colors.text}
        style={styles.watermark}
      />
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name={config.icon}
            size={22}
            color={theme.colors.text}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{config.name}</Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: `${statusColors[status]}22` },
            ]}
          >
            <Text style={[styles.badgeText, { color: statusColors[status] }]}>
              {status}
            </Text>
          </View>
        </View>
      </View>

      {expanded ? (
        <View style={styles.chartWrap}>{renderHistory()}</View>
      ) : (
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
      )}

      <View style={styles.footer}>
        <View
          style={[styles.statusDot, { backgroundColor: statusColors[status] }]}
        />
        <Text style={styles.lastUpdate}>{getLastUpdate()}</Text>
        <Text style={styles.toggleHint}>
          {expanded ? "Masquer" : "Voir historique"}
        </Text>
      </View>
    </Pressable>
  );
};

const getStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: theme.isDark ? 0.2 : 0.08,
      shadowRadius: 18,
      elevation: 4,
      overflow: "hidden",
    },
    cardPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.95,
    },
    glow: {
      position: "absolute",
      top: -60,
      right: -40,
      width: 140,
      height: 140,
      borderRadius: 999,
    },
    watermark: {
      position: "absolute",
      right: 12,
      bottom: 8,
      fontSize: 42,
      opacity: 0.1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
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
      fontWeight: "700",
      color: theme.colors.text,
      fontFamily: Platform.select({
        ios: "Avenir Next",
        android: "sans-serif-medium",
        default: "System",
      }),
    },
    badge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      marginTop: 6,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    valueContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: 12,
    },
    chartWrap: {
      marginBottom: 12,
      minHeight: 72,
      justifyContent: "center",
    },
    chart: {
      height: 64,
      flexDirection: "row",
      alignItems: "flex-end",
    },
    chartBar: {
      flex: 1,
      marginHorizontal: 2,
      alignItems: "center",
      justifyContent: "flex-end",
    },
    chartBarFill: {
      width: 6,
      borderRadius: 6,
    },
    chartLoading: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    chartLoadingText: {
      marginLeft: 8,
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    chartEmpty: {
      color: theme.colors.textSubtle,
      fontSize: 12,
      textAlign: "center",
    },
    value: {
      fontSize: 36,
      fontWeight: "bold",
      color: theme.colors.text,
      fontFamily: Platform.select({
        ios: "Avenir Next",
        android: "sans-serif",
        default: "System",
      }),
    },
    unit: {
      fontSize: 18,
      color: theme.colors.textMuted,
      marginLeft: 6,
    },
    offline: {
      fontSize: 18,
      color: theme.colors.textSubtle,
      fontStyle: "italic",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    lastUpdate: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    toggleHint: {
      marginLeft: "auto",
      fontSize: 11,
      color: theme.colors.textMuted,
    },
  });
