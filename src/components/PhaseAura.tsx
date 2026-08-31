import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { useDrawIn } from '@/components/motion';
import { phasePigment, type PhaseKey } from '@/theme/phaseColors';

/**
 * A soft field of light behind the top of a screen. Three overlapping radial
 * blooms in the colour of the phase you are actually in, so the app changes
 * temperature with the body rather than staying one flat surface.
 *
 * This used to bloom in the accent, weighted toward the period tone while
 * bleeding — which meant that on Dust Rose every screen in every week of the
 * month was washed the same pink, and the app read as a one-colour product.
 * The phase pigment leads now and the accent supports it, so the same screen
 * is warm in week one and cool in week three. A cycle we have not learned yet
 * has no confident colour, so `unknown` falls back to the accent.
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

  const pigment = phasePigment(colors.phases, phase);

  // The soft end leads: a wash wants the lighter half of the pair, with the
  // deep one behind it for depth. The accent keeps the third bloom, so
  // choosing a different accent still visibly changes the screen.
  const primary = pigment ? pigment.soft : accent;
  const secondary = pigment ? pigment.deep : accentGlow;
  const tertiary = accentGlow;

  // Restraint matters more than presence: past roughly a third opacity the
  // wash stops reading as light and starts reading as a muddy gradient. The
  // ochre and violet pigments sit further from the paper than Dust Rose did,
  // so they are held back a little further still.
  const base = (isDark ? 0.3 : 0.34) * intensity;

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
