// app/(tabs)/settings.tsx
import React from "react";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";
import { useAppTheme, useThemeController } from "@/constants/theme";

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { toggle, mode } = useThemeController();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>CesIOT</Text>
        <Text style={styles.title}>Réglages</Text>
        <Text style={styles.subtitle}>Personnalise l’apparence de l’app.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Thème</Text>
            <Text style={styles.hint}>
              {mode === "system" ? "Système" : theme.isDark ? "Sombre" : "Clair"}
            </Text>
          </View>
          <Switch
            value={theme.isDark}
            onValueChange={toggle}
            thumbColor={theme.isDark ? theme.colors.accent : "#f8fafc"}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentSoft }}
          />
        </View>
      </View>
    </View>
  );
}

const getStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingTop: Platform.OS === "ios" ? 64 : 40,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    kicker: {
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: theme.colors.accent,
      fontWeight: "700",
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.colors.text,
      marginTop: 6,
      fontFamily: Platform.select({
        ios: "Avenir Next",
        android: "sans-serif-medium",
        default: "System",
      }),
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginTop: 6,
    },
    card: {
      marginHorizontal: 20,
      marginTop: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
    },
    hint: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
  });
