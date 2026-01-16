// hooks/useSensorData.ts
import { useState, useEffect, useCallback } from 'react';
import { SensorData, SensorType } from '@/types/sensors';
import { API_ENDPOINTS, REFRESH_INTERVAL } from '@/constants/config';

export const useSensorData = () => {
  const [data, setData] = useState<SensorData>({
    temperature: null,
    pressure: null,
    distance: null,
    sound: null,
    timestamp: Date.now(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSensorValue = async (sensor: SensorType): Promise<number | null> => {
    try {
      const response = await fetch(API_ENDPOINTS[sensor]);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      // Adapter selon le format de votre API
      return result.value || result[sensor] || null;
    } catch (err) {
      console.error(`Error fetching ${sensor}:`, err);
      return null;
    }
  };

  const fetchAllSensors = useCallback(async () => {
    try {
      setLoading(true);
      const [temperature, pressure, distance, sound] = await Promise.all([
        fetchSensorValue('temperature'),
        fetchSensorValue('pressure'),
        fetchSensorValue('distance'),
        fetchSensorValue('sound'),
      ]);

      setData({
        temperature,
        pressure,
        distance,
        sound,
        timestamp: Date.now(),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllSensors();
    const interval = setInterval(fetchAllSensors, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAllSensors]);

  return { data, loading, error, refresh: fetchAllSensors };
};