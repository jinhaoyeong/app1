import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { useDrawIn } from '@/components/motion';
import type { PhaseKey } from '@/theme/tokens';

/**
 * A soft field of light behind the top of a screen. Three overlapping radial
 * blooms in the current accent, weighted toward the period colour during
 * bleeding and toward the accent's glow mid-cycle, so the app changes
 * temperature with the body rather than staying one flat surface.
 *
 * Decorative only — it never carries information, so it is hidden from
 * screen readers and safe to sit behind text at these opacities.
 */
export function PhaseAura({
  phase = 'unknown',
  height = 460,
  intensity = 1,
}: {
  phase?: PhaseKey;
  height?: number;
  intensity?: number;
}) {
  const { colors, accent, accentGlow, isDark } = useTheme();

  const warmth =
    phase === 'menstrual'
      ? 1
      : phase === 'luteal'
        ? 0.6
        : phase === 'ovulation'
          ? 0.1
          : phase === 'follicular'
            ? 0.25
            : 0.4;

  // Blend toward the period signal as warmth rises; toward the accent's glow
  // as the cycle opens up. Colours stay in the accent family either way.
  const primary = warmth > 0.75 ? colors.period : accent;
  const secondary = warmth > 0.5 ? accent : accentGlow;
  const tertiary = warmth > 0.3 ? accentGlow : colors.fertile;

  // Restraint matters more than presence: past roughly a third opacity the
  // wash stops reading as light and starts reading as a muddy gradient.
  const base = (isDark ? 0.32 : 0.38) * intensity;

  const fade = useDrawIn(1, 60);
  const style = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, { height }, style]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          {/* Off-canvas centres keep the brightest part outside the frame, so
              the page reads as lit from beyond the edge rather than stained. */}
          <RadialGradient id="aura-a" cx="8%" cy="-12%" rx="78%" ry="70%">
            <Stop offset="0" stopColor={primary} stopOpacity={base} />
            <Stop offset="0.55" stopColor={primary} stopOpacity={base * 0.3} />
            <Stop offset="1" stopColor={primary} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="aura-b" cx="98%" cy="6%" rx="70%" ry="62%">
            <Stop offset="0" stopColor={secondary} stopOpacity={base * 0.9} />
            <Stop
              offset="0.55"
              stopColor={secondary}
              stopOpacity={base * 0.26}
            />
            <Stop offset="1" stopColor={secondary} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="aura-c" cx="55%" cy="48%" rx="80%" ry="46%">
            <Stop offset="0" stopColor={tertiary} stopOpacity={base * 0.42} />
            <Stop offset="1" stopColor={tertiary} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#aura-a)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#aura-b)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#aura-c)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
});
