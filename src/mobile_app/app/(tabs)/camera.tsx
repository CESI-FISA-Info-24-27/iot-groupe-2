// app/(tabs)/camera.tsx
import React, { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { CameraSnapshot } from "@/components/CameraSnapshot";
import { API_ENDPOINTS } from "@/constants/config";
import { useAppTheme } from "@/constants/theme";

export default function CameraScreen() {
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<{
    ok: boolean;
    lastHttpStatus?: number;
    xCache?: string;
  }>({ ok: true });
  const theme = useAppTheme();
  const styles = getStyles(theme);

  useFocusEffect(
    useCallback(() => {
      setPaused(false);
      return () => setPaused(true);
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextState => {
      setPaused(nextState !== "active");
    });

    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Caméra en direct</Text>
        <Text style={styles.subtitle}>{API_ENDPOINTS.cameraSnapshot}</Text>
        <Text style={styles.statusText}>
          Statut: {status.ok ? "OK" : "KO"}
          {status.lastHttpStatus ? ` • HTTP ${status.lastHttpStatus}` : ""}
          {status.xCache ? ` • X-Cache ${status.xCache}` : ""}
        </Text>
      </View>
      
      <View style={styles.streamContainer}>
        <CameraSnapshot
          baseUrl={API_ENDPOINTS.cameraSnapshot}
          fps={4}
          paused={paused}
          adaptive
          onStatusChange={setStatus}
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
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  statusText: {
    color: theme.colors.text,
    fontSize: 12,
    marginTop: 6,
  },
  streamContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  });
