import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Caption,
  HeroText,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { CycleRing } from '@/components/CycleRing';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { useLumaStore } from '@/store/lumaStore';
import { greetingForNow } from '@/utils/dates';
import { MOOD_OPTIONS, ENERGY_OPTIONS } from '@/data/catalog';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent } = useTheme();
  const name = useLumaStore((s) => s.profile.displayName);
  const {
    cycleDay,
    prediction,
    predictionWindow,
    confidenceText,
    phaseLabel,
    todayInsight,
    todayLog,
    recommendations,
    baseline,
  } = useCycleIntelligence();

  const mood = MOOD_OPTIONS.find((m) => m.value === todayLog?.mood);
  const energy = ENERGY_OPTIONS.find((e) => e.value === todayLog?.energy);
  const tip = recommendations[0];
  const primaryHref = todayInsight.actionHref ?? '/log';
  const primaryLabel =
    todayInsight.actionLabel ?? (todayLog ? 'Edit log' : 'Log today');

  const logSummary = todayLog
    ? [mood?.label, energy?.label].filter(Boolean).join(' · ') || 'Logged'
    : null;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: 120,
          paddingHorizontal: spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Caption style={{ color: accent, letterSpacing: 0.8 }}>Luma</Caption>
          <Caption>
            {greetingForNow()}
            {name ? `, ${name}` : ''}
          </Caption>
        </View>

        <View style={styles.heroRow}>
          <View style={{ flex: 1, paddingRight: spacing.lg }}>
            {prediction && prediction.confidenceBand !== 'learning' ? (
              <>
                <HeroText style={{ marginTop: spacing.md }}>
                  {predictionWindow}
                </HeroText>
                <Body muted style={{ marginTop: spacing.sm }}>
                  Period likely around now
                </Body>
                <Caption style={{ marginTop: spacing.sm }}>
                  {confidenceText}
                  {cycleDay ? ` · Day ${cycleDay}` : ''}
                </Caption>
              </>
            ) : (
              <>
                <HeroText style={{ marginTop: spacing.md, fontSize: 32 }}>
                  Learning your cycle
                </HeroText>
                <Body muted style={{ marginTop: spacing.sm }}>
                  {baseline.message}
                </Body>
                {cycleDay ? (
                  <Caption style={{ marginTop: spacing.sm }}>
                    Day {cycleDay}
                  </Caption>
                ) : null}
              </>
            )}
            <Caption style={{ marginTop: spacing.md }}>{phaseLabel}</Caption>
          </View>
          <CycleRing
            cycleDay={cycleDay}
            cycleLength={baseline.averageCycleLength ?? 28}
          />
        </View>

        <View
          style={[
            styles.insightBlock,
            { borderColor: colors.border },
          ]}
        >
          <Body style={{ fontWeight: '600', fontSize: 18, lineHeight: 26 }}>
            {todayInsight.title}
          </Body>
          <Body muted style={{ marginTop: spacing.sm }}>
            {todayInsight.body}
          </Body>
          {todayInsight.meta ? (
            <Caption style={{ marginTop: spacing.md }}>
              {todayInsight.meta}
            </Caption>
          ) : null}
          {tip ? (
            <Caption style={{ marginTop: spacing.md }}>
              Today · {tip}
            </Caption>
          ) : null}
        </View>

        <View style={{ marginTop: spacing.xxl }}>
          <PrimaryButton
            label={primaryLabel}
            onPress={() => router.push(primaryHref as any)}
          />
          {logSummary ? (
            <Pressable
              onPress={() => router.push('/log')}
              accessibilityRole="button"
              accessibilityLabel={`Edit today's log. ${logSummary}`}
              style={{ marginTop: spacing.lg }}
            >
              <Caption style={{ textAlign: 'center' }}>
                Logged · {logSummary} · Edit
              </Caption>
            </Pressable>
          ) : (
            <Caption style={{ marginTop: spacing.lg, textAlign: 'center' }}>
              You don&apos;t need to log every day.
            </Caption>
          )}
        </View>

        <Caption
          style={{
            marginTop: spacing.xxxl,
            color: colors.textTertiary,
            textAlign: 'center',
          }}
        >
          Estimates from your history — not certainties.
        </Caption>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  insightBlock: {
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
