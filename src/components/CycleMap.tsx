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
import type { FertilitySafety } from '@/engine/safety';
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
  fertilitySafety,
  asOf = toLocalDateString(),
  onEnableFertility,
}: {
  cycleMap: CycleMap | null | undefined;
  fertilityEnabled: boolean;
  fertilitySafety: FertilitySafety;
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
          Period timing and a personal range appear after a start is recorded.
        </Body>
      </View>
    );
  }

  const phase = cycleMap.phaseForDate(asOf);
  const showFertility = fertilityEnabled && fertilitySafety.canShow;
  const isCurrent = (start: string, end = start) =>
    asOf >= start && asOf <= end;

  return (
    <View
      style={[
        styles.panel,
        { borderColor: colors.border, backgroundColor: tint(0.05) },
      ]}
      accessible
      accessibilityLabel={
        showFertility
          ? 'Cycle map with period timing, calendar-only fertile and ovulation ranges, later-cycle timing, and a next-period estimate'
          : 'Cycle map with period timing and any available next-period estimate'
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Eyebrow color={accent}>Cycle map</Eyebrow>
          <SectionTitle style={{ marginTop: spacing.sm }}>
            This cycle
          </SectionTitle>
        </View>
        <DataText>{`DAY ${cycleMap.currentCycleDay ?? '—'}`}</DataText>
      </View>

      <View style={styles.timeline}>
        <TimingRow
          label="Period"
          value={dateRange(cycleMap.cycleStart, cycleMap.periodEnd)}
          detail={
            cycleMap.periodLengthKnown
              ? 'Recorded start, usual length'
              : 'Start only — end not assumed'
          }
          color={colors.phases.menstrual}
          current={phase === 'period'}
        />
        {showFertility ? (
          <>
            <TimingRow
              label="Possible fertile days"
              value={dateRange(
                cycleMap.fertileWindowStart,
                cycleMap.fertileWindowEnd,
              )}
              detail="broad estimate, not contraception"
              color={colors.phases.fertileSoft}
              current={phase === 'possible_fertile'}
            />
            <TimingRow
              label="Estimated ovulation timing"
              value={dateRange(
                cycleMap.ovulationWindowStart,
                cycleMap.ovulationWindowEnd,
              )}
              detail="a possible range, not an exact day"
              color={colors.phases.fertile}
              current={phase === 'possible_ovulation'}
            />
            <TimingRow
              label="Later-cycle estimate"
              value={dateRange(
                cycleMap.postOvulationWindowStart,
                cycleMap.postOvulationWindowEnd,
              )}
              detail="ovulation is not confirmed"
              color={colors.phases.luteal}
              current={phase === 'possible_post_ovulation'}
            />
          </>
        ) : null}
        {cycleMap.hasPeriodEstimate ? (
          <TimingRow
            label="Next period"
            value={dateRange(
              cycleMap.nextPeriodLowerBound,
              cycleMap.nextPeriodUpperBound,
            )}
            detail={
              cycleMap.confidenceBand === 'learning'
                ? 'Needs more history'
                : 'Estimated window'
            }
            color={colors.predicted}
            current={isCurrent(
              cycleMap.nextPeriodLowerBound,
              cycleMap.nextPeriodUpperBound,
            )}
          />
        ) : null}
      </View>

      {showFertility ? (
        <View style={[styles.note, { borderTopColor: colors.border }]}>
          <AppIcon name="information-circle-outline" size={15} color={accent} />
          <Body muted style={{ flex: 1 }}>
            {cycleMap.explanation} Do not treat any calendar day as “safe” for
            unprotected sex. If avoiding pregnancy, use a proven contraceptive
            method. If trying to conceive, consider current-cycle fertility
            signs or guidance from a qualified professional.
          </Body>
        </View>
      ) : (
        <PressableScale
          onPress={onEnableFertility}
          disabled={!onEnableFertility}
          accessibilityRole="button"
          accessibilityLabel={
            fertilitySafety.canShow
              ? 'Review possible fertile timing in health profile'
              : fertilitySafety.title
          }
          scaleTo={0.985}
          style={[styles.optIn, { borderTopColor: colors.border }]}
        >
          <View style={[styles.optInMark, { backgroundColor: tint(0.14) }]}>
            <AppIcon
              name="information-circle-outline"
              size={17}
              color={accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMedium, { color: colors.text }]}>
              {fertilitySafety.canShow
                ? 'Show possible fertile timing'
                : fertilitySafety.title}
            </Text>
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
    borderRadius: radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xxxl,
  },
  empty: {
    borderRadius: radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xxxl,
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
    minWidth: 0,
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
