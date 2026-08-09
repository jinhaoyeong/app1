import React from 'react';
import { format, parseISO } from 'date-fns';
import { PressableScale } from '@/components/motion';
import {
  AppIcon,
  Body,
  Caption,
  DataText,
  Eyebrow,
  SectionTitle,
} from '@/components/ui';
import type { CycleMap } from '@/engine/fertility';
import { toLocalDateString } from '@/utils/dates';
import { radii, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { StyleSheet, Text, View } from 'react-native';

function dateLabel(date: string) {
  return format(parseISO(date), 'MMM d');
}

function dateRange(start: string, end: string) {
  return start === end
    ? dateLabel(start)
    : `${dateLabel(start)} – ${dateLabel(end)}`;
}

function TimingRow({
  label,
  value,
  detail,
  color,
  current,
}: {
  label: string;
  value: string;
  detail?: string;
  color: string;
  current?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderTopColor: colors.border }]}>
      <View style={[styles.marker, { backgroundColor: color }]} />
      <View style={styles.rowCopy}>
        <View style={styles.rowLabel}>
          <Text style={[typography.bodyMedium, { color: colors.text }]}>
            {label}
          </Text>
          {current ? <DataText color={color}>TODAY</DataText> : null}
        </View>
        {detail ? <Caption style={{ marginTop: 2 }}>{detail}</Caption> : null}
      </View>
      <Text
        style={[typography.mono, styles.value, { color: colors.text }]}
        accessibilityLabel={`${label}: ${value}`}
      >
        {value}
      </Text>
    </View>
  );
}

export function CycleMapPanel({
  cycleMap,
  fertilityEnabled,
  asOf = toLocalDateString(),
  onEnableFertility,
}: {
  cycleMap: CycleMap | null | undefined;
  fertilityEnabled: boolean;
  asOf?: string;
  onEnableFertility?: () => void;
}) {
  const { colors, accent, tint } = useTheme();

  if (!cycleMap) {
    return (
      <View
        style={[
          styles.empty,
          { borderColor: colors.border, backgroundColor: tint(0.05) },
        ]}
      >
        <Eyebrow color={accent}>Cycle map</Eyebrow>
        <SectionTitle style={{ marginTop: spacing.sm }}>
          Start with the day your period begins
        </SectionTitle>
        <Body muted style={{ marginTop: spacing.sm }}>
          Once Luma has a period start, it can lay out your likely phases and
          show how the timing becomes more personal with each cycle.
        </Body>
      </View>
    );
  }

  const phase = cycleMap.phaseForDate(asOf);
  const isCurrent = (start: string, end = start) =>
    asOf >= start && asOf <= end;

  return (
    <View
      style={[
        styles.panel,
        { borderColor: colors.border, backgroundColor: tint(0.05) },
      ]}
      accessible
      accessibilityLabel="Cycle map with estimated period, fertile window, ovulation day, day after ovulation, and next period"
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Eyebrow color={accent}>Cycle map</Eyebrow>
          <SectionTitle style={{ marginTop: spacing.sm }}>
            The detail behind your month
          </SectionTitle>
        </View>
        <DataText>{`DAY ${cycleMap.currentCycleDay ?? '—'}`}</DataText>
      </View>

      <View style={styles.timeline}>
        <TimingRow
          label="Period"
          value={dateRange(cycleMap.cycleStart, cycleMap.periodEnd)}
          detail="based on your logged start and usual length"
          color={colors.period}
          current={phase === 'period'}
        />
        {fertilityEnabled ? (
          <>
            <TimingRow
              label="Fertile window"
              value={dateRange(
                cycleMap.fertileWindowStart,
                cycleMap.fertileWindowEnd,
              )}
              detail="an estimate, not contraception"
              color={colors.fertile}
              current={phase === 'fertile'}
            />
            <TimingRow
              label="Ovulation day"
              value={dateLabel(cycleMap.ovulationDate)}
              detail={`possible range · ${dateRange(
                cycleMap.ovulationWindowStart,
                cycleMap.ovulationWindowEnd,
              )}`}
              color={colors.fertile}
              current={phase === 'ovulation'}
            />
            <TimingRow
              label="Day after ovulation"
              value={dateLabel(cycleMap.dayAfterOvulationDate)}
              detail="kept separate so the transition is easy to see"
              color={accent}
              current={phase === 'day_after_ovulation'}
            />
          </>
        ) : null}
        <TimingRow
          label="Next period"
          value={dateRange(
            cycleMap.nextPeriodLowerBound,
            cycleMap.nextPeriodUpperBound,
          )}
          detail={
            cycleMap.confidenceBand === 'learning'
              ? 'still learning your pattern'
              : 'estimated window'
          }
          color={colors.predicted}
          current={isCurrent(
            cycleMap.nextPeriodLowerBound,
            cycleMap.nextPeriodUpperBound,
          )}
        />
      </View>

      {fertilityEnabled ? (
        <View style={[styles.note, { borderTopColor: colors.border }]}>
          <AppIcon name="information-circle-outline" size={15} color={accent} />
          <Body muted style={{ flex: 1 }}>
            {cycleMap.explanation} These dates are not a guarantee and should
            never be used as contraception.
          </Body>
        </View>
      ) : (
        <PressableScale
          onPress={onEnableFertility}
          disabled={!onEnableFertility}
          accessibilityRole="button"
          accessibilityLabel="Show fertile window estimates in health profile"
          scaleTo={0.985}
          style={[styles.optIn, { borderTopColor: colors.border }]}
        >
          <View style={[styles.optInMark, { backgroundColor: tint(0.14) }]}>
            <AppIcon name="sparkles-outline" size={17} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMedium, { color: colors.text }]}>
              Show fertile timing
            </Text>
            <Caption style={{ marginTop: 2 }}>
              Turn on optional estimates for ovulation and the day after.
            </Caption>
          </View>
          <AppIcon
            name="chevron-forward"
            size={18}
            color={colors.textTertiary}
          />
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
  },
  empty: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  timeline: {
    marginTop: spacing.lg,
  },
  row: {
    minHeight: 64,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  marker: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  rowCopy: {
    flex: 1,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  value: {
    textAlign: 'right',
    maxWidth: 112,
    fontVariant: ['tabular-nums'],
  },
  note: {
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  optIn: {
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optInMark: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
