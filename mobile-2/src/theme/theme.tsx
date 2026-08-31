import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  type Theme as NavigationTheme,
} from 'expo-router';

import { darkColors, lightColors } from '@/theme/colors';

export type ThemeColors = Record<keyof typeof lightColors, string>;

export function createNavigationTheme(
  colors: ThemeColors,
  isDark: boolean,
): NavigationTheme {
  const baseTheme = isDark ? NavigationDarkTheme : NavigationLightTheme;

  return {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      border: colors.border,
      card: colors.surface,
      notification: colors.danger,
      primary: colors.accent,
      text: colors.text,
    },
  };
}

export type AppTheme = {
  colors: ThemeColors;
  isDark: boolean;
  radii: { card: number; control: number; pill: number };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
};

const lightTheme: AppTheme = {
  colors: lightColors,
  isDark: false,
  radii: { card: 24, control: 16, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
};

const ThemeContext = createContext<AppTheme>(lightTheme);

export function ThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  const theme = useMemo<AppTheme>(() => ({
    ...lightTheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    isDark: scheme === 'dark',
  }), [scheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}
