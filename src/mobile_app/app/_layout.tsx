// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useAppTheme } from "@/constants/theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}

function RootLayoutContent() {
  const theme = useAppTheme();
  return (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
