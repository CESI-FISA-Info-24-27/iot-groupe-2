// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/constants/theme";

export default function TabLayout() {
  const theme = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 90 : 60,
          paddingBottom: Platform.OS === "ios" ? 30 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="view-dashboard-variant" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "Caméra",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="camera" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: "Status",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="heart-pulse" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Réglages",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple icon component using emoji
function TabBarIcon({
  name,
  color,
  size,
}: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  size: number;
}) {
  return (
    <MaterialCommunityIcons
      name={name}
      color={color}
      size={Math.min(size + 2, 26)}
      style={[styles.tabIcon, { opacity: 0.9 }]}
    />
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    marginBottom: -2,
  },
});
