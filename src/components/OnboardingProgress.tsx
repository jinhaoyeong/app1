import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Caption } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

const TOTAL_STEPS = 6;

/** Steps: welcome=0 is separate; goals=1 … privacy=6 */
export function OnboardingProgress({ step }: { step: number }) {
  const { colors, accent } = useTheme();
  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: TOTAL_STEPS, now: step }}
      accessibilityLabel={`Step ${step} of ${TOTAL_STEPS}`}
    >
      <View style={styles.row}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const n = i + 1;
          const filled = n <= step;
          return (
            <View
              key={n}
              style={[
                styles.seg,
                {
                  backgroundColor: filled ? accent : colors.border,
                },
              ]}
            />
          );
        })}
      </View>
      <Caption style={{ marginTop: spacing.sm }}>
        Step {step} of {TOTAL_STEPS}
      </Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  seg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
});
