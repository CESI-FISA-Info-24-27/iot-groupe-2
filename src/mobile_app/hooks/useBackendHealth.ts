// hooks/useBackendHealth.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { API_ENDPOINTS, REFRESH_INTERVAL } from "@/constants/config";

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
  const hasLoadedRef = useRef(false);

  const fetchHealth = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log("🏥 Checking health at:", API_ENDPOINTS.health);
      const response = await fetch(API_ENDPOINTS.health);
      console.log("🏥 Health response status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = (await response.json()) as HealthResponse;
      console.log("🏥 Health result:", JSON.stringify(result));
      setData((prev) =>
        JSON.stringify(prev) === JSON.stringify(result) ? prev : result,
      );
      setError(null);
    } catch (err) {
      console.error("🏥 Health check failed:", err);
      console.error(
        "🏥 Error details:",
        JSON.stringify(err, Object.getOwnPropertyNames(err)),
      );
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setData(null);
    } finally {
      if (showLoading || !hasLoadedRef.current) {
        setLoading(false);
        hasLoadedRef.current = true;
      }
    }
  }, []);

  useEffect(() => {
    fetchHealth(true);
    const interval = setInterval(fetchHealth, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { data, loading, error, refresh: () => fetchHealth(true) };
};
