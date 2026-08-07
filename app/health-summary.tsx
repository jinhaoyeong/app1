import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Caption,
  Card,
  Chip,
  PrimaryButton,
  Screen,
  SectionTitle,
  Title,
} from '@/components/ui';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { spacing } from '@/theme/tokens';

export default function HealthSummaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const { buildSummary } = useCycleIntelligence();
  const summary = useMemo(() => buildSummary(months), [buildSummary, months]);

  const shareText = () => {
    const lines = [
      `Luma health summary · last ${months} months`,
      '',
      summary.averageCycle
        ? `Average cycle: ${summary.averageCycle} days`
        : 'Average cycle: learning',
      summary.cycleRange
        ? `Range: ${summary.cycleRange[0]}–${summary.cycleRange[1]} days`
        : '',
      summary.averageBleeding
        ? `Average bleeding: ${summary.averageBleeding} days`
        : '',
      summary.painSummary ?? '',
      summary.moodSummary ?? '',
      '',
      'Common symptoms:',
      ...summary.commonSymptoms.map(
        (s) => `· ${s.label}: logged across tracking history`,
      ),
      '',
      'Changes:',
      ...(summary.changes.length
        ? summary.changes.map((c) => `· ${c}`)
        : ['· None flagged']),
      '',
      'This summary is for discussion with a healthcare professional. Luma does not diagnose conditions.',
    ]
      .filter(Boolean)
      .join('\n');

    Share.share({ message: lines, title: 'Luma health summary' });
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xxl,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Caption>Back</Caption>
        </Pressable>
        <Title style={{ marginTop: spacing.md }}>Health summary</Title>
        <Body muted style={{ marginTop: spacing.sm }}>
          A calm overview for healthcare visits. Private notes and sex logs are
          never included by default.
        </Body>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: spacing.xl,
          }}
        >
          {([3, 6, 12] as const).map((m) => (
            <Chip
              key={m}
              label={`${m} months`}
              selected={months === m}
              onPress={() => setMonths(m)}
            />
          ))}
        </View>

        <Card style={{ marginTop: spacing.xl }}>
          <SectionTitle>Cycle</SectionTitle>
          <Body style={{ marginTop: spacing.sm }}>
            Average · {summary.averageCycle ?? '—'} days
          </Body>
          <Body muted>
            Range ·{' '}
            {summary.cycleRange
              ? `${summary.cycleRange[0]}–${summary.cycleRange[1]}`
              : '—'}
          </Body>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>Bleeding</SectionTitle>
          <Body style={{ marginTop: spacing.sm }}>
            Average · {summary.averageBleeding ?? '—'} days
          </Body>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>Pain & mood</SectionTitle>
          <Body muted style={{ marginTop: spacing.sm }}>
            {summary.painSummary ?? 'Not enough data yet.'}
          </Body>
          <Body muted style={{ marginTop: spacing.sm }}>
            {summary.moodSummary ?? ''}
          </Body>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>Common symptoms</SectionTitle>
          {summary.commonSymptoms.length === 0 ? (
            <Body muted style={{ marginTop: spacing.sm }}>
              No repeated symptoms yet.
            </Body>
          ) : (
            summary.commonSymptoms.map((s) => (
              <Body key={s.code} style={{ marginTop: spacing.sm }}>
                {s.label}
              </Body>
            ))
          )}
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>Important changes</SectionTitle>
          {summary.changes.length === 0 ? (
            <Body muted style={{ marginTop: spacing.sm }}>
              Nothing unusual relative to recent patterns.
            </Body>
          ) : (
            summary.changes.map((c) => (
              <Body key={c} style={{ marginTop: spacing.sm }}>
                · {c}
              </Body>
            ))
          )}
        </Card>

        <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
          <PrimaryButton label="Share / export text" onPress={shareText} />
          <PrimaryButton
            label="Show to healthcare professional"
            variant="secondary"
            onPress={shareText}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
