import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { WebView } from "react-native-webview";
import { useAppTheme } from "@/constants/theme";

type CameraStreamProps = {
  streamUrl: string;
  style?: StyleProp<ViewStyle>;
  onErrorChange?: (message: string | null) => void;
};

export const CameraStream: React.FC<CameraStreamProps> = ({
  streamUrl,
  style,
  onErrorChange,
}) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("[CameraStream] Rendering with URL:", streamUrl);

  const htmlContent = useMemo(() => {
    console.log("[CameraStream] Building HTML for:", streamUrl);
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body, html { width: 100%; height: 100%; background: #000; overflow: hidden; }
            #wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; }
            img { width: 100%; height: 100%; object-fit: cover; display: block; }
            #error { display: none; color: #ff4444; font-family: -apple-system, Arial, sans-serif; font-size: 14px; text-align: center; padding: 20px; }
            #debug { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.8); color: #0f0; font-size: 10px; padding: 4px 8px; font-family: monospace; z-index: 999; word-break: break-all; }
          </style>
        </head>
        <body>
          <div id="wrap">
            <img id="stream" src="${streamUrl}" alt="camera stream" />
            <div id="error"></div>
          </div>
          <div id="debug">Loading: ${streamUrl}</div>
          <script>
            const img = document.getElementById('stream');
            const errorDiv = document.getElementById('error');
            const debug = document.getElementById('debug');
            let startTime = Date.now();

            debug.textContent = 'Loading: ' + '${streamUrl}';

            img.onload = () => {
              const elapsed = Date.now() - startTime;
              debug.textContent = 'OK (' + elapsed + 'ms) : ' + '${streamUrl}';
              debug.style.color = '#0f0';
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'loaded', elapsed: elapsed}));
            };

            img.onerror = (e) => {
              const elapsed = Date.now() - startTime;
              img.style.display = 'none';
              errorDiv.style.display = 'block';
              errorDiv.textContent = 'Flux indisponible';
              debug.textContent = 'ERREUR (' + elapsed + 'ms) : ' + '${streamUrl}';
              debug.style.color = '#f44';
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'error', elapsed: elapsed, url: '${streamUrl}'}));
            };

            // Timeout 15s
            setTimeout(() => {
              if (!img.complete || img.naturalWidth === 0) {
                debug.textContent = 'TIMEOUT 15s : ' + '${streamUrl}';
                debug.style.color = '#fa0';
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'timeout', url: '${streamUrl}'}));
              }
            }, 15000);
          </script>
        </body>
      </html>
    `;
  }, [streamUrl]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        originWhitelist={["*"]}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled={false}
        scrollEnabled={false}
        cacheEnabled={false}
        onLoadStart={() => {
          console.log("[CameraStream] WebView onLoadStart");
          setLoading(true);
          setError(null);
          onErrorChange?.(null);
        }}
        onLoadEnd={() => {
          console.log("[CameraStream] WebView onLoadEnd");
          setLoading(false);
        }}
        onError={(e) => {
          console.log("[CameraStream] WebView onError:", e.nativeEvent);
          setLoading(false);
          const message = "Erreur lors du chargement du flux";
          setError(message);
          onErrorChange?.(message);
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log("[CameraStream] Message from WebView:", data);
            if (data.type === "error" || data.type === "timeout") {
              onErrorChange?.(`Stream ${data.type}: ${streamUrl}`);
            }
          } catch {}
        }}
        onHttpError={(e) => {
          console.log(
            "[CameraStream] HTTP Error:",
            e.nativeEvent.statusCode,
            streamUrl,
          );
          onErrorChange?.(`HTTP ${e.nativeEvent.statusCode}`);
        }}
      />

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.overlayText}>Connexion au flux vidéo…</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const getStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000",
      borderRadius: 12,
      overflow: "hidden",
    },
    webview: {
      flex: 1,
      backgroundColor: "#000",
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      padding: 16,
    },
    overlayText: {
      marginTop: 12,
      color: theme.colors.text,
      fontSize: 13,
      textAlign: "center",
    },
  });
