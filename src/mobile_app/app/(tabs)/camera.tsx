// app/(tabs)/camera.tsx
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CameraStream } from "@/components/CameraStream";
import { API_ENDPOINTS } from "@/constants/config";
import { useAppTheme } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const FILTERS = [
  { id: "none", label: "Normale", icon: "camera" as const },
  { id: "blur", label: "Vie privée", icon: "eye-off" as const },
  { id: "grayscale", label: "Noir & Blanc", icon: "moon-waning-crescent" as const },
  { id: "edges", label: "Contours", icon: "vector-polyline" as const },
  { id: "nightvision", label: "Nuit", icon: "weather-night" as const },
  { id: "thermal", label: "Thermique", icon: "thermometer" as const },
  { id: "highcontrast", label: "Contraste", icon: "brightness-6" as const },
];

export default function CameraScreen() {
  const [activeFilter, setActiveFilter] = useState("none");
  const [streamError, setStreamError] = useState<string | null>(null);
  const theme = useAppTheme();
  const styles = getStyles(theme);

  // All streams go through the hub (face-detector) for fan-out
  const streamUrl = API_ENDPOINTS.cameraFaceStream(activeFilter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Caméra en direct</Text>
        <Text style={styles.debugUrl} numberOfLines={1}>
          {streamUrl}
        </Text>
        {streamError ? (
          <Text style={styles.statusError}>{streamError}</Text>
        ) : (
          <Text style={styles.statusOk}>Statut : OK</Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const active = f.id === activeFilter;
          return (
            <Pressable
              key={f.id}
              onPress={() => setActiveFilter(f.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <MaterialCommunityIcons
                name={f.icon}
                size={16}
                color={active ? theme.colors.accent : theme.colors.textMuted}
              />
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.streamContainer}>
        <CameraStream
          key={streamUrl}
          streamUrl={streamUrl}
          onErrorChange={setStreamError}
        />
      </View>
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
      padding: 20,
      paddingTop: 60,
      backgroundColor: theme.colors.surfaceAlt,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 4,
    },
    debugUrl: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontFamily: "monospace" as const,
      marginTop: 2,
    },
    statusOk: {
      color: theme.colors.success,
      fontSize: 12,
      marginTop: 4,
    },
    statusError: {
      color: theme.colors.danger,
      fontSize: 12,
      marginTop: 4,
    },
    filterRow: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: theme.colors.accentSoft,
      borderColor: theme.colors.accent,
    },
    chipLabel: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textMuted,
    },
    chipLabelActive: {
      color: theme.colors.accent,
    },
    streamContainer: {
      flex: 1,
      margin: 16,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.colors.surface,
    },
  });
