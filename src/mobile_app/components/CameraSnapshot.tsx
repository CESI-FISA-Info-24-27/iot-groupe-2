import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type StatusPayload = {
  ok: boolean;
  lastHttpStatus?: number;
  xCache?: string;
};

type CameraSnapshotProps = {
  baseUrl: string;
  fps?: number;
  paused?: boolean;
  adaptive?: boolean;
  style?: StyleProp<ViewStyle>;
  onStatusChange?: (s: StatusPayload) => void;
};

const MIN_FPS = 0.5;
const MIN_INTERVAL_MS = 200;
const STATUS_INTERVAL_MS = 2000;
const ERROR_THRESHOLD = 3;
const SUCCESS_THRESHOLD = 5;

const appendCacheBuster = (url: string, ts: number) => {
  if (url.includes("?")) {
    if (url.endsWith("?") || url.endsWith("&")) {
      return `${url}t=${ts}`;
    }
    return `${url}&t=${ts}`;
  }
  return `${url}?t=${ts}`;
};

export const CameraSnapshot: React.FC<CameraSnapshotProps> = ({
  baseUrl,
  fps = 4,
  paused = false,
  adaptive = true,
  style,
  onStatusChange,
}) => {
  const [imageUrl, setImageUrl] = useState(() => appendCacheBuster(baseUrl, Date.now()));
  const [effectiveFps, setEffectiveFps] = useState(fps);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [consecutiveSuccesses, setConsecutiveSuccesses] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusInFlightRef = useRef(false);
  const backedOffRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const lastOkUrlRef = useRef<string | null>(null);

  const updateStatus = useCallback(
    (next: StatusPayload) => {
      onStatusChange?.(next);
    },
    [onStatusChange]
  );

  const markSuccess = useCallback(() => {
    setConsecutiveErrors(0);
    setConsecutiveSuccesses(prev => prev + 1);
  }, []);

  const markError = useCallback(() => {
    setConsecutiveErrors(prev => prev + 1);
    setConsecutiveSuccesses(0);
  }, []);

  useEffect(() => {
    setEffectiveFps(fps);
  }, [fps]);

  useEffect(() => {
    if (!adaptive) return;

    if (consecutiveErrors >= ERROR_THRESHOLD && !backedOffRef.current) {
      setEffectiveFps(prev => Math.max(MIN_FPS, prev / 2));
      backedOffRef.current = true;
    }

    if (consecutiveSuccesses >= SUCCESS_THRESHOLD) {
      setEffectiveFps(prev => Math.min(fps, prev * 2));
      setConsecutiveSuccesses(0);
    }
  }, [adaptive, consecutiveErrors, consecutiveSuccesses, fps]);

  useEffect(() => {
    if (consecutiveErrors === 0) {
      backedOffRef.current = false;
    }
  }, [consecutiveErrors]);

  const checkStatus = useCallback(
    async (url: string) => {
      if (statusInFlightRef.current) return;
      statusInFlightRef.current = true;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      try {
        let response = await fetch(url, { method: "HEAD", signal: controller.signal });

        if (response.status === 405 || response.status === 501) {
          response = await fetch(url, {
            method: "GET",
            headers: { Range: "bytes=0-0" },
            signal: controller.signal,
          });
        }

        const xCache = response.headers.get("X-Cache") ?? undefined;
        const ok = response.ok;

        updateStatus({ ok, lastHttpStatus: response.status, xCache });
        if (ok) {
          markSuccess();
        } else {
          markError();
        }
      } catch {
        updateStatus({ ok: false });
        markError();
      } finally {
        clearTimeout(timeoutId);
        statusInFlightRef.current = false;
      }
    },
    [markError, markSuccess, updateStatus]
  );

  const refreshImage = useCallback(() => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    const url = appendCacheBuster(baseUrl, Date.now());
    setImageUrl(url);
    refreshInFlightRef.current = false;
  }, [baseUrl]);

  useEffect(() => {
    if (paused) return;

    refreshImage();

    const intervalMs = Math.max(1000 / effectiveFps, MIN_INTERVAL_MS);
    timerRef.current = setInterval(refreshImage, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [effectiveFps, paused, refreshImage]);

  useEffect(() => {
    if (paused) return;

    const runStatus = () => {
      const targetUrl = lastOkUrlRef.current ?? appendCacheBuster(baseUrl, Date.now());
      void checkStatus(targetUrl);
    };

    runStatus();
    statusTimerRef.current = setInterval(runStatus, STATUS_INTERVAL_MS);

    return () => {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;
      }
    };
  }, [baseUrl, checkStatus, paused]);

  const showWeakSignal = consecutiveErrors > ERROR_THRESHOLD;

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode="contain"
        onLoad={() => {
          lastOkUrlRef.current = imageUrl;
          markSuccess();
        }}
        onError={() => {
          markError();
          if (lastOkUrlRef.current) {
            setImageUrl(lastOkUrlRef.current);
          }
        }}
      />

      {showWeakSignal && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Signal faible</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  overlayText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
  },
});
