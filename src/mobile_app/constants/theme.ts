import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

export type AppTheme = {
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    border: string;
    accent: string;
    accentSoft: string;
    success: string;
    warning: string;
    danger: string;
    dangerBg: string;
    tabBarBackground: string;
    tabBarBorder: string;
  };
};

export const themes: Record<"light" | "dark", AppTheme> = {
  light: {
    isDark: false,
    colors: {
      background: "#f8fafc",
      surface: "#ffffff",
      surfaceAlt: "#f1f5f9",
      text: "#0f172a",
      textMuted: "#475569",
      textSubtle: "#64748b",
      border: "#e2e8f0",
      accent: "#2563eb",
      accentSoft: "#dbeafe",
      success: "#16a34a",
      warning: "#f59e0b",
      danger: "#dc2626",
      dangerBg: "#fee2e2",
      tabBarBackground: "#ffffff",
      tabBarBorder: "#e2e8f0",
    },
  },
  dark: {
    isDark: true,
    colors: {
      background: "#0b1220",
      surface: "#0f172a",
      surfaceAlt: "#111827",
      text: "#f8fafc",
      textMuted: "#94a3b8",
      textSubtle: "#64748b",
      border: "#1f2937",
      accent: "#60a5fa",
      accentSoft: "#0ea5e933",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
      dangerBg: "#7f1d1d",
      tabBarBackground: "#111827",
      tabBarBorder: "#1f2937",
    },
  },
};

type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  const theme = useMemo(() => {
    if (mode === "light") return themes.light;
    if (mode === "dark") return themes.dark;
    return themes[systemScheme === "dark" ? "dark" : "light"];
  }, [mode, systemScheme]);

  const toggle = () => {
    setMode(prev => {
      const current = prev === "system"
        ? systemScheme === "dark"
          ? "dark"
          : "light"
        : prev;
      return current === "dark" ? "light" : "dark";
    });
  };

  const value = useMemo(() => ({ theme, mode, setMode, toggle }), [theme, mode]);

  return React.createElement(ThemeContext.Provider, { value }, children);
};

export const useAppTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }
  return ctx.theme;
};

export const useThemeController = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeController must be used within ThemeProvider");
  }
  return ctx;
};
