// components/CameraStream.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Image } from 'expo-image';
import { API_ENDPOINTS } from '@/constants/config';

export const CameraStream: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0); // Pour forcer le rechargement

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    // Réessayer après 5 secondes
    setTimeout(() => {
      setKey(prev => prev + 1);
      setLoading(true);
      setError(false);
    }, 5000);
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={styles.loadingText}>Connexion au flux caméra...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📹</Text>
          <Text style={styles.errorText}>Impossible de charger le flux</Text>
          <Text style={styles.errorSubtext}>Nouvelle tentative dans 5s...</Text>
        </View>
      )}

      <Image
        key={key}
        source={{ uri: API_ENDPOINTS.camera }}
        style={styles.stream}
        contentFit="contain"
        onLoad={handleLoad}
        onError={handleError}
        cachePolicy="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stream: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorSubtext: {
    color: '#9ca3af',
    fontSize: 12,
  },
});