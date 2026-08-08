import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  accents,
  darkColors,
  lightColors,
  withAlpha,
  type ThemeColors,
} from '@/theme/tokens';
import { useLumaStore } from '@/store/lumaStore';

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  accent: string;
  accentGlow: string;
  /** Accent at a given opacity — used for washes, tints, and marks. */
  tint: (alpha: number) => string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const colorMode = useLumaStore((s) => s.appearance.colorMode);
  const accentKey = useLumaStore((s) => s.appearance.accent);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark =
      colorMode === 'dark' || (colorMode === 'system' && scheme === 'dark');
    const base = isDark ? darkColors : lightColors;
    const definition = accents[accentKey];
    const accent = isDark ? definition.darkColor : definition.color;
    const accentGlow = isDark ? definition.darkGlow : definition.glow;
    return {
      colors: {
        ...base,
        accent,
        accentGlow,
        accentInk: isDark ? definition.darkInk : definition.ink,
      },
      isDark,
      accent,
      accentGlow,
      tint: (alpha: number) => withAlpha(accent, alpha),
    };
  }, [scheme, colorMode, accentKey]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
