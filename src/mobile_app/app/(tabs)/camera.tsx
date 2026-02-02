// app/(tabs)/camera.tsx
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CameraStream } from "@/components/CameraStream";
import { API_ENDPOINTS } from "@/constants/config";
import { useAppTheme } from "@/constants/theme";

export default function CameraScreen() {
  const [streamError, setStreamError] = useState<string | null>(null);
  const theme = useAppTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Caméra en direct</Text>
        <Text style={styles.subtitle}>{API_ENDPOINTS.cameraStream}</Text>
        {streamError ? (
          <Text style={styles.statusError}>{streamError}</Text>
        ) : (
          <Text style={styles.statusText}>Statut: OK</Text>
        )}
      </View>
      
      <View style={styles.streamContainer}>
        <CameraStream
          streamUrl={API_ENDPOINTS.cameraStream}
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
  statusError: {
    color: theme.colors.danger,
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
