import React, { type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  Body,
  Caption,
  HeroText,
  IconButton,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { Reveal, useDrawIn } from '@/components/motion';
import { radii, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { FitScrollView } from '@/components/FitScrollView';
import { stackBottomInset } from '@/navigation/tabRoute';

/** Step ticks: a measured rule that fills as you move through setup. */
function StepTicks({ step, total }: { step: number; total: number }) {
  const { colors, accent } = useTheme();
  const progress = useDrawIn(step / total, 80);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Setup step ${step} of ${total}`}
      style={styles.ticks}
    >
      <View
        style={[styles.tickTrack, { backgroundColor: colors.surfaceMuted }]}
      >
        <Animated.View
          style={[styles.tickFill, { backgroundColor: accent }, fillStyle]}
        />
      </View>
      <Text style={[typography.mono, { color: colors.textTertiary }]}>
        {String(step).padStart(2, '0')}/{String(total).padStart(2, '0')}
      </Text>
    </View>
  );
}

export function OnboardingFrame({
  step,
  total = 7,
  title,
  description,
  children,
  footer,
  onBack,
}: {
  step: number;
  total?: number;
  title: string;
  description?: string;
  children?: ReactNode;
  footer: ReactNode;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 600 || height < 760;
  const horizontalPadding = width < 360 ? spacing.lg : spacing.xxl;
  const bottom = stackBottomInset(insets.bottom, Platform.OS === 'web');

  return (
    <Screen>
      <View style={styles.shell}>
        <View
          style={[
            styles.top,
            {
              paddingTop: insets.top + (compact ? spacing.xs : spacing.sm),
              paddingHorizontal: horizontalPadding,
              paddingBottom: compact ? spacing.sm : spacing.md,
            },
          ]}
        >
          <View style={styles.topInner}>
            {onBack ? (
              <IconButton
                name="chevron-back"
                onPress={onBack}
                accessibilityLabel="Go back"
              />
            ) : (
              <View style={styles.emptyHit} />
            )}
            <StepTicks step={step} total={total} />
          </View>
        </View>

        <FitScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: compact ? spacing.md : spacing.lg,
              paddingBottom: compact ? spacing.xxl : spacing.huge,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Reveal index={0}>
            <View style={[styles.heading, compact && styles.compactHeading]}>
              <HeroText style={compact ? styles.compactTitle : undefined}>
                {title}
              </HeroText>
              {description ? (
                <Body muted style={{ marginTop: spacing.md, maxWidth: 480 }}>
                  {description}
                </Body>
              ) : null}
            </View>
          </Reveal>
          <Reveal index={1}>
            <View style={[styles.body, compact && styles.compactBody]}>
              {children}
            </View>
          </Reveal>
        </FitScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom:
                bottom + (compact ? spacing.sm : spacing.md),
              paddingHorizontal: horizontalPadding,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={styles.footerInner}>{footer}</View>
        </View>
      </View>
    </Screen>
  );
}

export function OnboardingContinue({
  label = 'Continue',
  disabled,
  onPress,
  secondary,
  hint,
}: {
  label?: string;
  disabled?: boolean;
  onPress: () => void;
  secondary?: ReactNode;
  hint?: string;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      {hint ? <Caption style={{ textAlign: 'center' }}>{hint}</Caption> : null}
      <PrimaryButton
        label={label}
        disabled={disabled}
        onPress={onPress}
        icon="arrow-forward"
      />
      {secondary}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
  },
  top: {
    paddingBottom: spacing.md,
  },
  topInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  ticks: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tickTrack: {
    flex: 1,
    height: 4,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  tickFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  emptyHit: {
    width: 44,
    height: 44,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  heading: {
    marginTop: spacing.huge,
  },
  compactHeading: {
    marginTop: spacing.md,
  },
  compactTitle: {
    fontSize: 34,
    lineHeight: 38,
  },
  body: {
    marginTop: spacing.xxxl,
  },
  compactBody: {
    marginTop: spacing.lg,
  },
  footer: {
    paddingTop: spacing.sm,
  },
  footerInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
});
