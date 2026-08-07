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
import {
  explainConfidence,
  explainEstimates,
  explainPhase,
} from '@/utils/explain';
import { MOOD_OPTIONS, ENERGY_OPTIONS, GOAL_OPTIONS } from '@/data/catalog';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent } = useTheme();
  const name = useLumaStore((s) => s.profile.displayName);
  const goals = useLumaStore((s) => s.profile.trackingGoals);
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
  const emphasizePrediction =
    goals.includes('predict_period') || goals.includes('prepare_period');
  const emphasizeSymptoms =
    goals.includes('understand_symptoms') ||
    goals.includes('understand_mood') ||
    goals.includes('understand_energy');
  const isLearning =
    !prediction || prediction.confidenceBand === 'learning';

  const primaryHref =
    isLearning || !todayLog
      ? '/log'
      : (todayInsight.actionHref ?? '/log');
  const primaryLabel = isLearning
    ? 'Log today'
    : todayInsight.actionLabel && todayInsight.actionHref !== '/log'
      ? todayInsight.actionLabel
      : todayLog
        ? 'Edit log'
        : 'Log today';

  const logSummary = todayLog
    ? [mood?.label, energy?.label].filter(Boolean).join(' · ') || 'Logged'
    : null;

  const goalHint = goals.length
    ? goals
        .slice(0, 2)
        .map((g) => GOAL_OPTIONS.find((o) => o.value === g)?.label ?? g)
        .join(' · ')
    : null;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: 148,
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
        {goalHint ? (
          <Caption style={{ marginTop: spacing.sm }}>Focus · {goalHint}</Caption>
        ) : null}

        <View style={styles.heroRow}>
          <View style={{ flex: 1, paddingRight: spacing.lg }}>
            {emphasizePrediction && !isLearning ? (
              <>
                <HeroText style={{ marginTop: spacing.md }}>
                  {predictionWindow}
                </HeroText>
                <Body muted style={{ marginTop: spacing.sm }}>
                  Period likely in this window
                </Body>
                <Pressable
                  onPress={explainConfidence}
                  accessibilityRole="button"
                  accessibilityLabel="Explain prediction confidence"
                  hitSlop={8}
                  style={{ marginTop: spacing.sm, minHeight: 32, justifyContent: 'center' }}
                >
                  <Caption style={{ color: accent }}>
                    {confidenceText}
                    {cycleDay ? ` · Day ${cycleDay}` : ''} · Why?
                  </Caption>
                </Pressable>
              </>
            ) : isLearning ? (
              <>
                <HeroText style={{ marginTop: spacing.md, fontSize: 32 }}>
                  Learning your cycle
                </HeroText>
                <Body muted style={{ marginTop: spacing.sm }}>
                  {baseline.message} Start by logging how you feel — or when
                  bleeding begins.
                </Body>
                {cycleDay ? (
                  <Caption style={{ marginTop: spacing.sm }}>
                    Day {cycleDay}
                  </Caption>
                ) : null}
              </>
            ) : (
              <>
                <HeroText style={{ marginTop: spacing.md }}>
                  Day {cycleDay ?? '—'}
                </HeroText>
                <Body muted style={{ marginTop: spacing.sm }}>
                  {emphasizeSymptoms
                    ? 'Here’s what usually shows up for you around now.'
                    : `Period likely in ${predictionWindow}`}
                </Body>
                <Pressable
                  onPress={explainConfidence}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={{ marginTop: spacing.sm, minHeight: 32, justifyContent: 'center' }}
                >
                  <Caption style={{ color: accent }}>
                    {confidenceText} · Why?
                  </Caption>
                </Pressable>
              </>
            )}
            <Pressable
              onPress={explainPhase}
              accessibilityRole="button"
              accessibilityLabel={`Cycle phase: ${phaseLabel}. Explain.`}
              hitSlop={8}
              style={{ marginTop: spacing.md, minHeight: 32, justifyContent: 'center' }}
            >
              <Caption>
                {phaseLabel} · Explain
              </Caption>
            </Pressable>
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
            <Caption style={{ marginTop: spacing.md }}>Today · {tip}</Caption>
          ) : null}
        </View>

        <View style={{ marginTop: spacing.xxl }}>
          <PrimaryButton
            label={primaryLabel}
            onPress={() => router.push(primaryHref as any)}
          />
          {todayInsight.actionHref &&
          todayInsight.actionHref !== primaryHref &&
          todayInsight.actionLabel ? (
            <View style={{ marginTop: spacing.md }}>
              <PrimaryButton
                label={todayInsight.actionLabel}
                variant="secondary"
                onPress={() => router.push(todayInsight.actionHref as any)}
              />
            </View>
          ) : null}
          {logSummary ? (
            <Pressable
              onPress={() => router.push('/log')}
              accessibilityRole="button"
              accessibilityLabel={`Edit today's log. ${logSummary}`}
              style={{ marginTop: spacing.lg, minHeight: 44, justifyContent: 'center' }}
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

        <Pressable
          onPress={explainEstimates}
          accessibilityRole="button"
          style={{ marginTop: spacing.xxxl, minHeight: 44, justifyContent: 'center' }}
        >
          <Caption
            style={{
              color: colors.textTertiary,
              textAlign: 'center',
            }}
          >
            Estimates from your history — not certainties. Learn more
          </Caption>
        </Pressable>
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
