import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { dark, light, type ColorScheme } from './colors';
import { motion, shadow } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme-preference';

type ThemeValue = {
  colors: ColorScheme;
  isDark: boolean;
  /** Elevation helpers already bound to the active scheme. */
  shadow: { card: object; sheet: object };
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPreferenceState(v);
      })
      .catch(() => {
        /* first run, or storage unavailable — 'system' is a fine default */
      });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const isDark = preference === 'system' ? system !== 'light' : preference === 'dark';

  const value = useMemo<ThemeValue>(
    () => ({
      colors: isDark ? dark : light,
      isDark,
      shadow: { card: shadow.card(isDark) ?? {}, sheet: shadow.sheet(isDark) ?? {} },
      preference,
      setPreference,
    }),
    [isDark, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export function useThemePreference() {
  const { preference, setPreference } = useTheme();
  return { preference, setPreference };
}

/**
 * Motion tokens, already collapsed for the OS "Reduce Motion" setting.
 *
 * Screens should never branch on reduced motion themselves — read durations
 * from here and they will simply be 0 when the user has asked for less motion.
 * `enabled` is exposed for the cases that need to swap a whole treatment
 * (e.g. the check-in celebration becomes a static checkmark).
 */
export function useMotion() {
  const reduced = useReducedMotion();
  return useMemo(() => {
    if (!reduced) return { ...motion, enabled: true, reduced: false };
    return {
      ...motion,
      duration: { micro: 0, enter: 0, exit: 0, celebration: 0 },
      pressScale: 1,
      enabled: false,
      reduced: true,
    };
  }, [reduced]);
}
