// app/(tabs)/camera.tsx
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CameraStream } from "@/components/CameraStream";
import { API_ENDPOINTS } from "@/constants/config";
import { useAppTheme } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type CameraMode = "raw" | "face";

const FILTERS = [
  { id: "blur", label: "Vie privée", icon: "eye-off" as const },
  { id: "none", label: "Normale", icon: "camera" as const },
  {
    id: "grayscale",
    label: "Noir & Blanc",
    icon: "moon-waning-crescent" as const,
  },
  { id: "edges", label: "Contours", icon: "vector-polyline" as const },
  { id: "nightvision", label: "Nuit", icon: "weather-night" as const },
  { id: "thermal", label: "Thermique", icon: "thermometer" as const },
  { id: "highcontrast", label: "Contraste", icon: "brightness-6" as const },
];

export default function CameraScreen() {
  const [mode, setMode] = useState<CameraMode>("raw");
  const [activeFilter, setActiveFilter] = useState("blur");
  const [streamError, setStreamError] = useState<string | null>(null);
  const theme = useAppTheme();
  const styles = getStyles(theme);

  // raw → proxy backend existant (inchangé), face → face-detector via backend
  const streamUrl =
    mode === "raw"
      ? API_ENDPOINTS.cameraStream
      : API_ENDPOINTS.cameraFaceStream(activeFilter);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Caméra en direct</Text>
        {streamError ? (
          <Text style={styles.statusError}>{streamError}</Text>
        ) : (
          <Text style={styles.statusOk}>Statut : OK</Text>
        )}
      </View>

      {/* Mode toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, mode === "raw" && styles.toggleBtnActive]}
          onPress={() => setMode("raw")}
        >
          <MaterialCommunityIcons
            name="camera"
            size={18}
            color={mode === "raw" ? "#fff" : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.toggleLabel,
              mode === "raw" && styles.toggleLabelActive,
            ]}
          >
            Cam normale
          </Text>
        </Pressable>

        <Pressable
          style={[styles.toggleBtn, mode === "face" && styles.toggleBtnActive]}
          onPress={() => setMode("face")}
        >
          <MaterialCommunityIcons
            name="face-recognition"
            size={18}
            color={mode === "face" ? "#fff" : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.toggleLabel,
              mode === "face" && styles.toggleLabelActive,
            ]}
          >
            Flou visages
          </Text>
        </Pressable>
      </View>

      {/* Filter chips (visible seulement en mode face) */}
      {mode === "face" && (
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
                <Text
                  style={[styles.chipLabel, active && styles.chipLabelActive]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Stream */}
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
    toggleRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    toggleBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    toggleBtnActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    toggleLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    toggleLabelActive: {
      color: "#fff",
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
