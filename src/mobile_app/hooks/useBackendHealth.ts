// hooks/useBackendHealth.ts
import { useCallback, useEffect, useState } from 'react';
import { API_ENDPOINTS, REFRESH_INTERVAL } from '@/constants/config';

type HealthResponse = {
  status?: string;
  services?: {
    mqtt?: string;
    influxdb?: string;
    [key: string]: string | undefined;
  };
};

export const useBackendHealth = () => {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.health);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = (await response.json()) as HealthResponse;
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { data, loading, error, refresh: fetchHealth };
};
