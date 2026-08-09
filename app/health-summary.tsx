import React, { useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import {
  Body,
  Caption,
  DataText,
  Divider,
  EmptyNote,
  Metric,
  PrimaryButton,
  SectionRule,
} from '@/components/ui';
import { DetailFrame } from '@/components/DetailFrame';
import { WhenToSeekHelp } from '@/components/WhenToSeekHelp';
import { PressableScale } from '@/components/motion';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { radii, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const RANGES = [3, 6, 12] as const;

export default function HealthSummaryScreen() {
  const { colors, accent, tint } = useTheme();
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const { buildSummary } = useCycleIntelligence();
  const summary = useMemo(() => buildSummary(months), [buildSummary, months]);

  const shareText = () => {
    const lines = [
      `Luma health summary, last ${months} months`,
      '',
      summary.averageCycle
        ? `Average cycle: ${summary.averageCycle} days`
        : 'Average cycle: learning',
      summary.cycleRange
        ? `Range: ${summary.cycleRange[0]}-${summary.cycleRange[1]} days`
        : '',
      summary.averageBleeding
        ? `Average bleeding: ${summary.averageBleeding} days`
        : '',
      summary.painSummary ?? '',
      summary.moodSummary ?? '',
      '',
      'Common symptoms:',
      ...summary.commonSymptoms.map(
        (s) =>
          `- ${s.label}: logged in ${s.count} of ${s.total} ${
            s.total === 1 ? 'cycle' : 'cycles'
          }`,
      ),
      '',
      'Changes:',
      ...(summary.changes.length
        ? summary.changes.map((c) => `- ${c}`)
        : ['- None flagged']),
      '',
      'This summary is for discussion with a healthcare professional. Luma does not diagnose conditions.',
    ]
      .filter(Boolean)
      .join('\n');

    Share.share({ message: lines, title: 'Luma health summary' });
  };

  return (
    <DetailFrame
      eyebrow="For a healthcare visit"
      title="Health summary"
      description="A calm overview of what you tracked. Private notes are never included."
      footer={
        <PrimaryButton
          label="Share summary"
          onPress={shareText}
          icon="share-outline"
        />
      }
    >
      <View style={styles.segment}>
        {RANGES.map((m) => {
          const selected = months === m;
          return (
            <PressableScale
              key={m}
              onPress={() => setMonths(m)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Last ${m} months`}
              scaleTo={0.95}
              style={[
                styles.segmentItem,
                {
                  backgroundColor: selected ? accent : colors.surfaceMuted,
                  borderColor: selected ? accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  typography.label,
                  { color: selected ? colors.accentInk : colors.textSecondary },
                ]}
              >
                {m} months
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <SectionRule
        label="At a glance"
        style={styles.sectionSpace}
        right={<DataText>{`last ${months}m`}</DataText>}
      />
      <View
        style={[
          styles.glance,
          { borderColor: colors.border, backgroundColor: tint(0.06) },
        ]}
      >
        <Metric
          value={summary.averageCycle ? `${summary.averageCycle}` : '—'}
          label="avg cycle"
          detail="days"
        />
        <Metric
          value={summary.averageBleeding ? `${summary.averageBleeding}` : '—'}
          label="bleeding"
          detail="days"
        />
        <Metric
          value={
            summary.cycleRange
              ? `${summary.cycleRange[0]}–${summary.cycleRange[1]}`
              : '—'
          }
          label="range"
          detail="days"
        />
      </View>

      <SectionRule label="Pain and mood" style={styles.sectionSpace} />
      {summary.painSummary || summary.moodSummary ? (
        <View style={{ gap: spacing.sm }}>
          {summary.painSummary ? <Body>{summary.painSummary}</Body> : null}
          {summary.moodSummary ? (
            <Body muted>{summary.moodSummary}</Body>
          ) : null}
        </View>
      ) : (
        <EmptyNote
          icon="pulse-outline"
          title="Not enough data yet"
          body="Log pain or mood on a few more days to fill this section."
        />
      )}

      <SectionRule label="Common symptoms" style={styles.sectionSpace} />
      {summary.commonSymptoms.length === 0 ? (
        <EmptyNote icon="list-outline" title="No repeated symptoms yet" />
      ) : (
        summary.commonSymptoms.map((s, i) => (
          <View key={s.code}>
            <View style={styles.symptomRow}>
              <Body style={{ flex: 1, fontWeight: '700' }}>{s.label}</Body>
              <DataText color={colors.text}>
                {s.count} of {s.total} {s.total === 1 ? 'cycle' : 'cycles'}
              </DataText>
            </View>
            {i < summary.commonSymptoms.length - 1 ? <Divider /> : null}
          </View>
        ))
      )}

      <SectionRule label="Important changes" style={styles.sectionSpace} />
      {summary.changes.length === 0 ? (
        <EmptyNote
          icon="checkmark-circle-outline"
          title="Nothing unusual relative to your recent patterns"
        />
      ) : (
        summary.changes.map((c) => (
          <View key={c} style={styles.changeRow}>
            <View style={[styles.changeDot, { backgroundColor: accent }]} />
            <Body style={{ flex: 1 }}>{c}</Body>
          </View>
        ))
      )}

      <View style={{ marginTop: spacing.mega }}>
        <WhenToSeekHelp />
      </View>

      <View style={[styles.disclaimer, { borderColor: colors.border }]}>
        <Caption>
          This summary describes what you logged. Luma does not diagnose
          conditions — bring it to a clinician for interpretation.
        </Caption>
      </View>
    </DetailFrame>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionSpace: {
    marginTop: spacing.mega,
    marginBottom: spacing.lg,
  },
  glance: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  symptomRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  changeDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    marginTop: 9,
  },
  disclaimer: {
    marginTop: spacing.mega,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
