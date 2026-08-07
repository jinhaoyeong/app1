import type { AccentTheme } from '@/types';

export const accents: Record<
  AccentTheme,
  { label: string; color: string }
> = {
  dust_rose: { label: 'Dust Rose', color: '#B87A7A' },
  lavender: { label: 'Lavender', color: '#8B7BA8' },
  sage: { label: 'Sage', color: '#7A9278' },
  ocean: { label: 'Ocean', color: '#6A8A9A' },
  sand: { label: 'Sand', color: '#B59A78' },
  plum: { label: 'Plum', color: '#8A6A84' },
};

export const lightColors = {
  background: '#FAF9F7',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F1ED',
  text: '#161616',
  textSecondary: '#707070',
  textTertiary: '#9A9A9A',
  border: '#E8E4DE',
  period: '#8B5E5E',
  predicted: '#C4B5A5',
  fertile: '#A8B5A0',
  warningSoft: '#8A6A4A',
  successSoft: '#6A8A72',
  overlay: 'rgba(22, 22, 22, 0.35)',
};

export const darkColors = {
  background: '#111111',
  surface: '#1A1A1A',
  surfaceMuted: '#222222',
  text: '#F2EDE6',
  textSecondary: '#A3A3A3',
  textTertiary: '#757575',
  border: '#2A2A2A',
  period: '#C48989',
  predicted: '#8A7D70',
  fertile: '#8A9A84',
  warningSoft: '#C4A078',
  successSoft: '#8AAD96',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export type ThemeColors = typeof lightColors & { accent: string };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
};

export const typography = {
  hero: { fontSize: 36, lineHeight: 42, fontWeight: '600' as const },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '600' as const },
  section: { fontSize: 19, lineHeight: 26, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '500' as const },
};
