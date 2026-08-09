import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppIcon,
  Body,
  Caption,
  DataText,
  DisplayText,
  Eyebrow,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { CycleRibbon } from '@/components/CycleRibbon';
import { Reveal } from '@/components/motion';
import { radii, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { FitScrollView } from '@/components/FitScrollView';

const PROMISES = [
  { icon: 'cloud-done-outline', text: 'Syncs to your account' },
  { icon: 'analytics-outline', text: 'Learns your baseline' },
  { icon: 'eye-off-outline', text: 'Never sold, never profiled' },
] as const;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent, accentGlow, tint } = useTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 600 || height < 760;
  const horizontalPadding = width < 360 ? spacing.lg : spacing.xxl;

  return (
    <Screen>
      <FitScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (compact ? spacing.lg : spacing.xxl),
            paddingBottom: insets.bottom + (compact ? spacing.lg : spacing.xxl),
            paddingHorizontal: horizontalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Reveal index={0}>
          <View style={styles.brandRow}>
            <View style={[styles.brandMark, { backgroundColor: accent }]}>
              <View
                style={[styles.brandCore, { backgroundColor: accentGlow }]}
              />
            </View>
            <Text
              style={[
                typography.eyebrow,
                { color: colors.text, fontSize: 13, letterSpacing: 3 },
              ]}
            >
              LUMA
            </Text>
          </View>
        </Reveal>

        <View style={[styles.hero, compact && styles.compactHero]}>
          <Reveal index={1}>
            <Eyebrow color={accent}>A private cycle journal</Eyebrow>
            <DisplayText
              style={[styles.headline, compact && styles.compactHeadline]}
            >
              Know your cycle.
            </DisplayText>
            <DisplayText
              style={[
                styles.headline,
                compact && styles.compactHeadline,
                { color: colors.textTertiary },
              ]}
            >
              Understand yourself.
            </DisplayText>
            <Body muted style={{ marginTop: spacing.xl, maxWidth: 420 }}>
              Most period apps tell you when your next period is. Luma teaches
              you what your cycle means for you — your baseline, your patterns,
              and what may be changing.
            </Body>
          </Reveal>

          <Reveal index={2} style={styles.ribbonWrap}>
            <View
              style={[
                styles.ribbonPanel,
                { borderColor: colors.border, backgroundColor: tint(0.06) },
              ]}
            >
              <CycleRibbon cycleDay={14} cycleLength={28} periodLength={5} />
            </View>
          </Reveal>

          <Reveal index={3}>
            <View style={styles.promises}>
              {PROMISES.map((p) => (
                <View key={p.text} style={styles.promise}>
                  <AppIcon name={p.icon} size={15} color={accent} />
                  <Caption style={{ color: colors.textSecondary }}>
                    {p.text}
                  </Caption>
                </View>
              ))}
            </View>
          </Reveal>
        </View>

        <Reveal index={4}>
          <PrimaryButton
            label="Set up Luma"
            onPress={() => router.push('/onboarding/goals')}
            icon="arrow-forward"
          />
          <View style={styles.footNote}>
            <DataText>about two minutes · change anything later</DataText>
          </View>
        </Reveal>
      </FitScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCore: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  hero: {
    marginTop: spacing.mega,
    marginBottom: spacing.mega,
  },
  compactHero: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
  },
  headline: {
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -2,
    marginTop: spacing.sm,
  },
  compactHeadline: {
    fontSize: 42,
    lineHeight: 43,
    letterSpacing: -1.6,
  },
  ribbonWrap: {
    marginTop: spacing.huge,
  },
  ribbonPanel: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  promises: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  promise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footNote: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
});
