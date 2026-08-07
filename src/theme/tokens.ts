import type { AccentTheme } from '@/types';

export const accents: Record<
  AccentTheme,
  { label: string; color: string }
> = {
  // Darkened for WCAG AA as text on #FAF9F7 and for tint fills
  dust_rose: { label: 'Dust Rose', color: '#8E5555' },
  lavender: { label: 'Lavender', color: '#6A5A88' },
  sage: { label: 'Sage', color: '#4F684D' },
  ocean: { label: 'Ocean', color: '#456A78' },
  sand: { label: 'Sand', color: '#8A6B45' },
  plum: { label: 'Plum', color: '#6A4E66' },
};

export const lightColors = {
  background: '#FAF9F7',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F1ED',
  text: '#161616',
  textSecondary: '#5C5C5C',
  textTertiary: '#6E6E6E',
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
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { fontSize: 17, lineHeight: 24, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '500' as const },
};
