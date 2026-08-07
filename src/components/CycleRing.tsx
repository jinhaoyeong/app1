import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { Body, Caption, HeroText } from '@/components/ui';

/** Soft progress arc for cycle day — decorative, not medically precise. */
export function CycleRing({
  cycleDay,
  cycleLength = 28,
}: {
  cycleDay?: number;
  cycleLength?: number;
}) {
  const { colors, accent } = useTheme();
  const size = 148;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = cycleDay
    ? Math.min(1, Math.max(0, cycleDay / Math.max(cycleLength, 1)))
    : 0.08;
  const offset = c * (1 - progress);

  return (
    <View style={styles.wrap} accessibilityLabel={cycleDay ? `Cycle day ${cycleDay}` : 'Learning cycle'}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Caption>Cycle Day</Caption>
        <HeroText style={{ fontSize: 34, lineHeight: 40 }}>
          {cycleDay ?? '—'}
        </HeroText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 148,
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
});
