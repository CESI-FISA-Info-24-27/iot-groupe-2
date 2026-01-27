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

  const fetchLatestValues = async (): Promise<Record<SensorType, number | null>> => {
    try {
      const url = `${API_ENDPOINTS.sensorsHistory}?range=24h`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const rows = Array.isArray(result?.data) ? result.data : [];

      const latest: Record<SensorType, number | null> = {
        temperature: null,
        pressure: null,
        distance: null,
        sound: null,
      };

      for (const row of rows) {
        const metric = row?.metric ?? row?.measurement ?? row?.field;
        if (metric in latest && row?.value !== undefined) {
          const value = Number(row.value);
          if (!Number.isNaN(value)) {
            latest[metric as SensorType] = value;
          }
        }
      }

      return latest;
    } catch (err) {
      console.error('Error fetching sensor history:', err);
      return {
        temperature: null,
        pressure: null,
        distance: null,
        sound: null,
      };
    }
  };

  const fetchAllSensors = useCallback(async () => {
    try {
      setLoading(true);
      const latest = await fetchLatestValues();

      setData({
        temperature: latest.temperature,
        pressure: latest.pressure,
        distance: latest.distance,
        sound: latest.sound,
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
