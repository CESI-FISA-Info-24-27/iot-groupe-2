// app/(tabs)/camera.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraStream } from '@/components/CameraStream';

export default function CameraScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Caméra en direct</Text>
      </View>
      
      <View style={styles.streamContainer}>
        <CameraStream />
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
  streamContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
});