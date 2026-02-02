import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import { useAppTheme } from "@/constants/theme";

type CameraStreamProps = {
  streamUrl: string;
  style?: StyleProp<ViewStyle>;
  onErrorChange?: (message: string | null) => void;
};

export const CameraStream: React.FC<CameraStreamProps> = ({ streamUrl, style, onErrorChange }) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const htmlContent = useMemo(
    () => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body, html { width: 100%; height: 100%; background: #000; overflow: hidden; }
            #wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
            img { width: 100%; height: 100%; object-fit: cover; display: block; }
            #error { display: none; color: #fff; font-family: -apple-system, Arial, sans-serif; }
          </style>
        </head>
        <body>
          <div id="wrap">
            <img id="stream" src="${streamUrl}" alt="camera stream" />
            <div id="error">Flux indisponible</div>
          </div>
          <script>
            const img = document.getElementById('stream');
            const error = document.getElementById('error');
            img.onerror = () => {
              img.style.display = 'none';
              error.style.display = 'block';
            };
          </script>
        </body>
      </html>
    `,
    [streamUrl]
  );

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
          setLoading(true);
          setError(null);
          onErrorChange?.(null);
        }}
        onLoadEnd={() => {
          setLoading(false);
        }}
        onError={() => {
          setLoading(false);
          const message = "Erreur lors du chargement du flux";
          setError(message);
          onErrorChange?.(message);
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
