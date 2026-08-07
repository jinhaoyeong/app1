import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { accents, darkColors, lightColors, type ThemeColors } from '@/theme/tokens';
import { useLumaStore } from '@/store/lumaStore';

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  accent: string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const colorMode = useLumaStore((s) => s.appearance.colorMode);
  const accentKey = useLumaStore((s) => s.appearance.accent);

  const value = useMemo(() => {
    const isDark =
      colorMode === 'dark' || (colorMode === 'system' && scheme === 'dark');
    const base = isDark ? darkColors : lightColors;
    const accent = accents[accentKey].color;
    return {
      colors: { ...base, accent },
      isDark,
      accent,
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
