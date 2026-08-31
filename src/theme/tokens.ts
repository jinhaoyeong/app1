import { Platform } from 'react-native';
import type { AccentTheme } from '@/types';
import { lightColors } from '@/theme/palette';

/**
 * Luma — expressive editorial.
 *
 * Bone and ink surfaces, oversized display type with tight tracking, and a
 * signature "light" gradient per accent that carries the cycle ribbon. Colour
 * always ships with a label; nothing here communicates bleeding by hue alone.
 */

export type AccentDefinition = {
  label: string;
  /** Short, human descriptor shown under the swatch. */
  mood: string;
  color: string;
  darkColor: string;
  /** Gradient partner used by the ribbon, aurora washes, and marks. */
  glow: string;
  darkGlow: string;
  ink: string;
  darkInk: string;
};

/**
 * Every accent is deliberately held below neon saturation.
 *
 * A high-chroma accent on a near-black ground — lime, cyan, electric violet —
 * is the visual signature of developer tooling and AI products. It is the
 * wrong register entirely for something opened in bed at the end of a bad day.
 * These are pigments: terracotta, dusty mauve, real sage (grey-green, never
 * chartreuse), weathered teal, ochre, dried plum.
 */
export const accents: Record<AccentTheme, AccentDefinition> = {
  dust_rose: {
    label: 'Dust Rose',
    mood: 'warm, close',
    color: '#A85751',
    darkColor: '#E0A096',
    glow: '#C98872',
    darkGlow: '#EFC7B4',
    ink: '#FFFFFF',
    darkInk: '#1B1412',
  },
  lavender: {
    label: 'Lavender',
    mood: 'quiet, dusk',
    color: '#6E5E86',
    darkColor: '#C0AECC',
    glow: '#9A87AC',
    darkGlow: '#DACBE0',
    ink: '#FFFFFF',
    darkInk: '#171320',
  },
  sage: {
    label: 'Sage',
    mood: 'grounded',
    color: '#5C6E52',
    darkColor: '#AEBF9C',
    glow: '#8A9A78',
    darkGlow: '#CBD5BB',
    ink: '#FFFFFF',
    darkInk: '#14180F',
  },
  ocean: {
    label: 'Ocean',
    mood: 'clear, cool',
    color: '#3D6874',
    darkColor: '#9CBFC7',
    glow: '#6E96A0',
    darkGlow: '#C3D8DC',
    ink: '#FFFFFF',
    darkInk: '#101A1D',
  },
  sand: {
    label: 'Sand',
    mood: 'low sun',
    color: '#8A6636',
    darkColor: '#DCB988',
    glow: '#B79262',
    darkGlow: '#EBD5B4',
    ink: '#FFFFFF',
    darkInk: '#1B1409',
  },
  plum: {
    label: 'Plum',
    mood: 'deep, still',
    color: '#7A4E62',
    darkColor: '#D2A3B4',
    glow: '#A87589',
    darkGlow: '#E6C7D1',
    ink: '#FFFFFF',
    darkInk: '#1C1218',
  },
};

export { darkColors, lightColors } from '@/theme/palette';

export type ThemeColors = typeof lightColors & {
  accent: string;
  accentGlow: string;
  accentInk: string;
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  mega: 56,
  giant: 72,
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  full: 999,
};

/** Data marks and measurements read as instrument output, not prose. */
export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}) as string;

/**
 * Fraunces — a soft, high-contrast serif with real character. It carries the
 * voice: warm and human where the system sans would read corporate. Custom
 * families must name their own weight, so these styles never set fontWeight.
 */
export const displayFont = {
  regular: 'Fraunces_400Regular',
  medium: 'Fraunces_500Medium',
  semibold: 'Fraunces_600SemiBold',
  bold: 'Fraunces_700Bold',
  italic: 'Fraunces_400Regular_Italic',
  semiboldItalic: 'Fraunces_600SemiBold_Italic',
};

export const typography = {
  /** Reserved for the single loudest answer on a screen. */
  display: {
    fontFamily: displayFont.bold,
    fontSize: 62,
    lineHeight: 62,
    letterSpacing: -2,
  },
  hero: {
    fontFamily: displayFont.bold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.9,
  },
  /** The same scale as hero, set in italic for warmth on emotional copy. */
  heroItalic: {
    fontFamily: displayFont.semiboldItalic,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: displayFont.semibold,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.5,
  },
  section: {
    fontFamily: displayFont.semibold,
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  /** Serif italic, for the app's warm asides — replies, notes, reassurance. */
  bodyItalic: {
    fontFamily: displayFont.italic,
    fontSize: 17,
    lineHeight: 25,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  label: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  /** All-caps rule labels that open a section. */
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800' as const,
    letterSpacing: 1.7,
  },
  micro: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700' as const,
    letterSpacing: 1.4,
  },
  mono: {
    fontFamily: monoFont,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
};

/** Motion is purposeful: arrival, response, and one living mark. */
export const motion = {
  spring: { damping: 17, stiffness: 230, mass: 0.9 },
  springSoft: { damping: 22, stiffness: 130, mass: 1 },
  press: { damping: 15, stiffness: 420, mass: 0.6 },
  fast: 150,
  base: 280,
  slow: 460,
  stagger: 55,
};

/**
 * Each phase gets its own light. The aura behind Today is built from these,
 * so the app quietly changes temperature as the cycle moves — warm and close
 * during a period, open and bright mid-cycle, softer as it winds down.
 */
export type PhaseKey =
  'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown';

export const phaseAura: Record<PhaseKey, { warmth: number; note: string }> = {
  menstrual: { warmth: 1, note: 'held close' },
  follicular: { warmth: 0.35, note: 'opening up' },
  ovulation: { warmth: 0.15, note: 'brightest' },
  luteal: { warmth: 0.7, note: 'winding down' },
  unknown: { warmth: 0.45, note: 'still learning' },
};

/**
 * One soft shadow, expressed the way each platform still supports.
 * React Native deprecated the `shadow*` style props on web in favour of
 * `boxShadow`, so keeping them everywhere produced console warnings on every
 * render of the dock.
 */
export function softShadow(
  color: string,
  opacity: number,
  radius: number,
  y = 8,
) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: y },
    },
    android: { elevation: Math.max(2, Math.round(radius / 3)) },
    default: {
      boxShadow: `0px ${y}px ${radius}px ${withAlpha(color, opacity)}`,
    },
  });
}

export function withAlpha(hex: string, alpha: number) {
  const value = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${value}`;
}
