// app/(tabs)/camera.tsx
import React, { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { CameraSnapshot } from "@/components/CameraSnapshot";
import { API_ENDPOINTS } from "@/constants/config";

export default function CameraScreen() {
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<{
    ok: boolean;
    lastHttpStatus?: number;
    xCache?: string;
  }>({ ok: true });

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
    color: "#9ca3af",
    fontSize: 12,
  },
  statusText: {
    color: "#e5e7eb",
    fontSize: 12,
    marginTop: 6,
  },
  streamContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
});
