import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { PressableScale } from '@/components/motion';
import {
  AppIcon,
  Body,
  Caption,
  Eyebrow,
  PrimaryButton,
  SectionTitle,
} from '@/components/ui';
import type { ConceptionGuidance } from '@/engine/conception';
import type { ConcernInsight } from '@/engine/concerns';
import { radii, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

function dateLabel(date: string) {
  return format(parseISO(date), 'MMM d');
}

function dateRange(start: string, end: string) {
  return start === end
    ? dateLabel(start)
    : `${dateLabel(start)} – ${dateLabel(end)}`;
}

function TimingLine({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  const { colors, accent } = useTheme();
  return (
    <View style={styles.timingLine}>
      <Caption>{label}</Caption>
      <Text
        style={[
          typography.section,
          { color: emphasis ? accent : colors.text, marginTop: 2 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Conception guidance. The education half is always shown once the goal is
 * declared; the dates half appears only when the fertility safety gate passes.
 * There is deliberately no single "best day" anywhere in this component — the
 * calendar cannot support that claim, and presenting one would invite planning
 * around a day that may be wrong.
 */
export function ConceptionCard({
  guidance,
  onReviewProfile,
}: {
  guidance: ConceptionGuidance;
  onReviewProfile: () => void;
}) {
  const { colors, tint, accent } = useTheme();
  const [showWhy, setShowWhy] = useState(false);

  return (
    <View
      style={[
        styles.panel,
        { borderColor: colors.border, backgroundColor: tint(0.05) },
      ]}
    >
      <Eyebrow color={accent}>Trying to conceive</Eyebrow>

      {guidance.datesAvailable && guidance.fertileWindow ? (
        <>
          <View style={styles.timingBlock}>
            <TimingLine
              label="Estimated fertile window"
              value={dateRange(
                guidance.fertileWindow.start,
                guidance.fertileWindow.end,
              )}
            />
            {guidance.higherOpportunityWindow ? (
              <TimingLine
                label="Higher-opportunity days"
                value={dateRange(
                  guidance.higherOpportunityWindow.start,
                  guidance.higherOpportunityWindow.end,
                )}
                emphasis
              />
            ) : null}
          </View>
          {guidance.estimateCaveat ? (
            <Caption style={styles.caveat}>{guidance.estimateCaveat}</Caption>
          ) : null}
        </>
      ) : (
        <View style={styles.blockedBlock}>
          <SectionTitle>{guidance.blockedTitle}</SectionTitle>
          <PressableScale
            onPress={() => setShowWhy((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showWhy }}
            accessibilityLabel="Why can't Luma estimate this?"
            scaleTo={0.97}
            style={styles.whyToggle}
          >
            <Text style={[typography.label, { color: accent }]}>
              Why can&rsquo;t Luma estimate this?
            </Text>
            <AppIcon
              name={showWhy ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={accent}
            />
          </PressableScale>
          {showWhy && guidance.blockedDetail ? (
            <Body muted style={styles.whyDetail}>
              {guidance.blockedDetail}
            </Body>
          ) : null}
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Body muted>{guidance.education}</Body>
      <Caption style={styles.signals}>{guidance.signalsNote}</Caption>

      {!guidance.datesAvailable ? (
        <View style={styles.action}>
          <PrimaryButton
            label="Review your cycle profile"
            variant="ghost"
            onPress={onReviewProfile}
            icon="arrow-forward"
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * A repeated pattern worth raising with a clinician. Shows the person's own
 * recorded evidence and a next action, and never names a condition — see the
 * layer boundary documented in `engine/concerns.ts`.
 */
export function ConcernCard({
  concern,
  onAction,
}: {
  concern: ConcernInsight;
  onAction: (href: string) => void;
}) {
  const { colors, tint, accent } = useTheme();
  return (
    <View
      style={[
        styles.panel,
        { borderColor: colors.border, backgroundColor: tint(0.05) },
      ]}
    >
      <Eyebrow color={accent}>{concern.title}</Eyebrow>
      <Body style={styles.evidence}>{concern.evidence}</Body>
      <Body muted style={styles.concernBody}>
        {concern.body}
      </Body>
      {concern.actionHref ? (
        <View style={styles.action}>
          <PrimaryButton
            label={concern.actionLabel ?? 'Open'}
            variant="ghost"
            onPress={() => onAction(concern.actionHref as string)}
            icon="arrow-forward"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
  },
  timingBlock: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  timingLine: {
    gap: 2,
  },
  caveat: {
    marginTop: spacing.md,
  },
  blockedBlock: {
    marginTop: spacing.lg,
  },
  whyToggle: {
    marginTop: spacing.md,
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  whyDetail: {
    marginTop: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xl,
  },
  signals: {
    marginTop: spacing.lg,
  },
  evidence: {
    marginTop: spacing.lg,
  },
  concernBody: {
    marginTop: spacing.md,
  },
  action: {
    marginTop: spacing.xl,
    alignSelf: 'flex-start',
  },
});
