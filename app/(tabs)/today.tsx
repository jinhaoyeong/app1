import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Caption,
  Card,
  HeroText,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { CycleRing } from '@/components/CycleRing';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { useLumaStore } from '@/store/lumaStore';
import { greetingForNow } from '@/utils/dates';
import { MOOD_OPTIONS, ENERGY_OPTIONS, PAIN_OPTIONS } from '@/data/catalog';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
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
  const pain = PAIN_OPTIONS.find((p) => p.value === todayLog?.pain);

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
        <Caption>
          {greetingForNow()}
          {name ? `, ${name}` : ''}
        </Caption>

        <View style={styles.heroRow}>
          <View style={{ flex: 1, paddingRight: spacing.lg }}>
            <Caption style={{ marginTop: spacing.lg }}>{phaseLabel}</Caption>
            {prediction && prediction.confidenceBand !== 'learning' ? (
              <>
                <Body muted style={{ marginTop: spacing.md }}>
                  Period likely in
                </Body>
                <HeroText style={{ marginTop: 4 }}>{predictionWindow}</HeroText>
                <Caption style={{ marginTop: spacing.sm }}>
                  {confidenceText}
                </Caption>
                <Caption style={{ marginTop: 4 }}>
                  {prediction.explanation}
                </Caption>
              </>
            ) : (
              <>
                <HeroText style={{ marginTop: spacing.sm, fontSize: 30 }}>
                  Learning your cycle
                </HeroText>
                <Body muted style={{ marginTop: spacing.sm }}>
                  {baseline.message}
                </Body>
              </>
            )}
          </View>
          <CycleRing
            cycleDay={cycleDay}
            cycleLength={baseline.averageCycleLength ?? 28}
          />
        </View>

        <Card style={{ marginTop: spacing.xxl }}>
          <Caption>{insightEyebrow(todayInsight.type)}</Caption>
          <SectionTitle style={{ marginTop: spacing.sm }}>
            {todayInsight.title}
          </SectionTitle>
          <Body muted style={{ marginTop: spacing.sm }}>
            {todayInsight.body}
          </Body>
          {todayInsight.meta ? (
            <Caption style={{ marginTop: spacing.md }}>
              {todayInsight.meta}
            </Caption>
          ) : null}
          {todayInsight.actionLabel && todayInsight.actionHref ? (
            <View style={{ marginTop: spacing.lg }}>
              <PrimaryButton
                label={todayInsight.actionLabel}
                variant="secondary"
                onPress={() => router.push(todayInsight.actionHref as any)}
              />
            </View>
          ) : null}
        </Card>

        {recommendations.length > 0 ? (
          <Card style={{ marginTop: spacing.lg }}>
            <SectionTitle>For today</SectionTitle>
            <Body muted style={{ marginTop: spacing.sm }}>
              Gentle options based on what you logged — not medical advice.
            </Body>
            {recommendations.map((tip) => (
              <Body key={tip} style={{ marginTop: spacing.sm }}>
                · {tip}
              </Body>
            ))}
          </Card>
        ) : null}

        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>Today</SectionTitle>
          {todayLog ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Body>
                Mood · {mood ? `${mood.emoji} ${mood.label}` : '—'}
              </Body>
              <Body>Energy · {energy?.label ?? '—'}</Body>
              <Body>Pain · {pain?.label ?? '—'}</Body>
              {todayLog.symptoms?.length ? (
                <Body muted>
                  {todayLog.symptoms.join(' · ')}
                </Body>
              ) : null}
              <View style={{ marginTop: spacing.md }}>
                <PrimaryButton
                  label="Edit today's log"
                  variant="ghost"
                  onPress={() => router.push('/log')}
                />
              </View>
            </View>
          ) : (
            <View style={{ marginTop: spacing.md }}>
              <Body muted>Nothing logged yet.</Body>
              <View style={{ marginTop: spacing.lg }}>
                <PrimaryButton
                  label="Log today"
                  onPress={() => router.push('/log')}
                />
              </View>
            </View>
          )}
        </Card>

        <Caption style={{ marginTop: spacing.xxl, color: colors.textTertiary }}>
          Predictions are estimates based on your history — not certainties.
        </Caption>
      </ScrollView>
    </Screen>
  );
}

function insightEyebrow(type: string): string {
  switch (type) {
    case 'change':
      return 'Something changed';
    case 'preparation':
      return 'Coming up';
    case 'personal_pattern':
      return 'Your pattern';
    case 'learning':
      return 'Getting started';
    default:
      return 'Insight';
  }
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
