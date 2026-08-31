import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppIcon,
  Body,
  Caption,
  DataText,
  Divider,
  Eyebrow,
  HeroText,
  IconButton,
  Screen,
  SectionRule,
  EmptyNote,
} from '@/components/ui';
import { PressableScale, Reveal } from '@/components/motion';
import { CycleMapPanel } from '@/components/CycleMap';
import { TAB_SCROLL_INSET } from '@/components/TabBar';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { useLumaStore } from '@/store/lumaStore';
import { isCycleEligibleBleeding } from '@/engine/cycle';
import { addLocalDays, toLocalDateString } from '@/utils/dates';
import { screenTopInset } from '@/navigation/tabRoute';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing, typography, withAlpha } from '@/theme/tokens';

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function LegendKey({
  label,
  swatch,
}: {
  label: string;
  swatch: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      {swatch}
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

function dateRangeSet(start: string, end: string) {
  const set = new Set<string>();
  let date = start;
  while (date <= end) {
    set.add(date);
    date = addLocalDays(date, 1);
  }
  return set;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent, tint } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const logs = useLumaStore((s) => s.dailyLogs);
  const {
    episodes,
    prediction,
    comparison,
    cycleMap,
    fertilitySafety,
    fertilityVisible,
  } = useCycleIntelligence();

  const predictedSet = useMemo(() => {
    const set = new Set<string>();
    if (!prediction || prediction.confidenceBand === 'learning') return set;
    let d = prediction.lowerBound;
    while (d <= prediction.upperBound) {
      set.add(d);
      d = addLocalDays(d, 1);
    }
    return set;
  }, [prediction]);

  const fertileSet = useMemo(() => {
    if (!fertilityVisible || !cycleMap) return new Set<string>();
    return dateRangeSet(cycleMap.fertileWindowStart, cycleMap.fertileWindowEnd);
  }, [cycleMap, fertilityVisible]);

  const ovulationSet = useMemo(() => {
    if (!fertilityVisible || !cycleMap) return new Set<string>();
    return dateRangeSet(
      cycleMap.ovulationWindowStart,
      cycleMap.ovulationWindowEnd,
    );
  }, [cycleMap, fertilityVisible]);

  const postOvulationSet = useMemo(() => {
    if (!fertilityVisible || !cycleMap) return new Set<string>();
    return dateRangeSet(
      cycleMap.postOvulationWindowStart,
      cycleMap.postOvulationWindowEnd,
    );
  }, [cycleMap, fertilityVisible]);

  const periodSet = useMemo(() => {
    const set = new Set<string>();
    for (const e of episodes) {
      // An open episode confirms its start, not five days of unrecorded flow.
      // Only an explicit end date or daily bleeding logs fill additional days.
      const end = e.endDate ?? e.startDate;
      let d = e.startDate;
      while (d <= end) {
        set.add(d);
        d = addLocalDays(d, 1);
      }
    }
    for (const [date, log] of Object.entries(logs)) {
      if (isCycleEligibleBleeding(log)) set.add(date);
    }
    return set;
  }, [episodes, logs]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const today = toLocalDateString();
  const monthKey = format(month, 'yyyy-MM');
  const monthStats = useMemo(() => {
    const inMonth = (d: string) => d.startsWith(monthKey);
    const periodDays = [...periodSet].filter(inMonth).length;
    const loggedDays = Object.keys(logs).filter(inMonth).length;
    return { periodDays, loggedDays };
  }, [logs, monthKey, periodSet]);

  const isCurrentMonth = monthKey === today.slice(0, 7);

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: screenTopInset(insets.top, Platform.OS === 'web'),
            paddingBottom: TAB_SCROLL_INSET,
            paddingHorizontal: isCompact ? spacing.xl : spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Reveal index={0}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Eyebrow color={accent}>Your record</Eyebrow>
              <HeroText style={{ marginTop: spacing.sm }}>
                {format(month, 'MMMM')}
              </HeroText>
              <DataText style={{ marginTop: 2 }}>
                {format(month, 'yyyy')}
              </DataText>
            </View>
            <View style={styles.monthNav}>
              <IconButton
                name="chevron-back"
                onPress={() => setMonth((m) => addMonths(m, -1))}
                accessibilityLabel="Previous month"
              />
              <IconButton
                name="chevron-forward"
                onPress={() => setMonth((m) => addMonths(m, 1))}
                accessibilityLabel="Next month"
              />
            </View>
          </View>

          <View style={[styles.statStrip, { borderColor: colors.border }]}>
            <DataText color={colors.text}>
              {monthStats.periodDays} period{' '}
              {monthStats.periodDays === 1 ? 'day' : 'days'}
            </DataText>
            <View
              style={[styles.statDot, { backgroundColor: colors.border }]}
            />
            <DataText>
              {monthStats.loggedDays}{' '}
              {monthStats.loggedDays === 1 ? 'day' : 'days'} logged
            </DataText>
            {!isCurrentMonth ? (
              <PressableScale
                onPress={() => setMonth(startOfMonth(new Date()))}
                accessibilityRole="button"
                accessibilityLabel="Jump to this month"
                scaleTo={0.94}
                style={[styles.jump, { borderColor: tint(0.4) }]}
              >
                <Text style={[typography.eyebrow, { color: accent }]}>
                  TODAY
                </Text>
              </PressableScale>
            ) : null}
          </View>
        </Reveal>

        <Reveal index={1}>
          <View style={styles.weekHeader}>
            {WEEK_LABELS.map((d) => (
              <Text
                key={d}
                style={[
                  typography.eyebrow,
                  {
                    color: colors.textTertiary,
                    width: `${100 / 7}%`,
                    textAlign: 'center',
                  },
                ]}
              >
                {d.slice(0, 1).toUpperCase()}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const inMonth = isSameMonth(day, month);
              const isPeriod = periodSet.has(key);
              const isPredicted = !isPeriod && predictedSet.has(key);
              const isFertile = !isPeriod && fertileSet.has(key);
              const isPossibleOvulation = ovulationSet.has(key);
              const isPossiblePostOvulation = postOvulationSet.has(key);
              const log = logs[key];
              const hasSymptoms = !!(
                log?.symptoms?.length ||
                log?.mood ||
                log?.energy
              );
              const isToday = key === today;

              const markerBits = [
                isPeriod ? 'period logged' : null,
                isPredicted ? 'estimated period window' : null,
                isFertile ? 'possible fertile days' : null,
                isPossibleOvulation ? 'estimated ovulation timing' : null,
                isPossiblePostOvulation
                  ? 'later-cycle calendar estimate'
                  : null,
                hasSymptoms ? 'symptoms logged' : null,
                isToday ? 'today' : null,
              ].filter(Boolean);

              return (
                <PressableScale
                  key={key}
                  onPress={() => router.push(`/day/${key}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${format(day, 'EEEE, MMMM d')}${
                    markerBits.length ? `, ${markerBits.join(', ')}` : ''
                  }`}
                  scaleTo={0.88}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.tile,
                      isCompact && styles.tileCompact,
                      {
                        backgroundColor: isPeriod
                          ? colors.phases.menstrual
                          : isPossibleOvulation
                            ? withAlpha(colors.phases.fertile, 0.22)
                            : isFertile
                              ? withAlpha(colors.phases.fertile, 0.1)
                              : isToday
                                ? tint(0.16)
                                : 'transparent',
                        borderColor: isPredicted
                          ? colors.predicted
                          : isPossibleOvulation
                            ? colors.phases.fertile
                            : isPossiblePostOvulation
                              ? colors.phases.luteal
                              : isToday
                                ? accent
                                : 'transparent',
                        borderWidth: isPossibleOvulation
                          ? 1.5
                          : isPredicted || isToday || isPossiblePostOvulation
                            ? 1.5
                            : 0,
                        borderStyle: isPredicted ? 'dashed' : 'solid',
                        opacity: inMonth ? 1 : 0.34,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.label,
                        {
                          fontVariant: ['tabular-nums'],
                          color: isPeriod
                            ? colors.periodInk
                            : isPossibleOvulation
                              ? colors.phases.fertile
                              : isToday
                                ? accent
                                : colors.text,
                        },
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.marker,
                      isPossibleOvulation && styles.ovulationMarker,
                      {
                        backgroundColor: hasSymptoms
                          ? accent
                          : isPossiblePostOvulation
                            ? colors.phases.luteal
                            : isPossibleOvulation
                              ? colors.phases.fertile
                              : isFertile
                                ? withAlpha(colors.phases.fertile, 0.65)
                                : 'transparent',
                      },
                    ]}
                  />
                </PressableScale>
              );
            })}
          </View>

          <View style={styles.legend}>
            <LegendKey
              label="Period"
              swatch={
                <View
                  style={[
                    styles.legendTile,
                    { backgroundColor: colors.phases.menstrual },
                  ]}
                />
              }
            />
            <LegendKey
              label="Estimated"
              swatch={
                <View
                  style={[
                    styles.legendTile,
                    {
                      borderColor: colors.predicted,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                    },
                  ]}
                />
              }
            />
            <LegendKey
              label="Symptoms"
              swatch={
                <View style={[styles.legendDot, { backgroundColor: accent }]} />
              }
            />
            {fertilityVisible ? (
              <>
                <LegendKey
                  label="Possible fertile days"
                  swatch={
                    <View
                      style={[
                        styles.legendTile,
                        {
                          backgroundColor: withAlpha(
                            colors.phases.fertile,
                            0.14,
                          ),
                          borderColor: colors.phases.fertile,
                          borderWidth: 1,
                        },
                      ]}
                    />
                  }
                />
                <LegendKey
                  label="Estimated ovulation timing"
                  swatch={
                    <View
                      style={[
                        styles.legendTile,
                        {
                          backgroundColor: withAlpha(
                            colors.phases.fertile,
                            0.22,
                          ),
                          borderColor: colors.phases.fertile,
                          borderWidth: 2,
                        },
                      ]}
                    />
                  }
                />
                <LegendKey
                  label="Later-cycle estimate"
                  swatch={
                    <View
                      style={[
                        styles.legendTile,
                        {
                          borderColor: colors.phases.luteal,
                          borderWidth: 1.5,
                        },
                      ]}
                    />
                  }
                />
              </>
            ) : null}
          </View>
          {fertilityVisible ? (
            <Caption style={{ marginTop: spacing.md }}>
              These calendar estimates are broad and are not contraception.
            </Caption>
          ) : null}
        </Reveal>

        <Reveal index={2}>
          <View style={{ marginTop: spacing.mega }}>
            <CycleMapPanel
              cycleMap={cycleMap}
              fertilityEnabled={fertilityVisible}
              fertilitySafety={fertilitySafety}
              onEnableFertility={() => router.push('/health-profile')}
            />
          </View>
        </Reveal>

        <Reveal index={3}>
          <SectionRule label="Cycle history" style={styles.sectionSpace} />
          {comparison.length === 0 ? (
            <EmptyNote
              icon="book-outline"
              title="Nothing on file yet"
              body="Your cycle history appears here as you track periods."
            />
          ) : (
            <View>
              {comparison.map((row, index) => (
                <View key={row.startDate}>
                  <PressableScale
                    onPress={() => router.push(`/day/${row.startDate}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Cycle starting ${format(
                      parseISO(row.startDate),
                      'MMMM d, yyyy',
                    )}`}
                    scaleTo={0.99}
                    dimTo={0.7}
                    style={styles.historyRow}
                  >
                    <View style={styles.historyIndex}>
                      <Text
                        style={[
                          typography.mono,
                          { color: colors.textTertiary, fontSize: 11 },
                        ]}
                      >
                        {String(comparison.length - index).padStart(2, '0')}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: '700' }}>
                        {format(parseISO(row.startDate), 'MMM d, yyyy')}
                      </Body>
                      <Caption style={{ marginTop: 3 }}>
                        {row.mainDifference ?? 'No comparison note yet'}
                      </Caption>
                    </View>
                    <View style={styles.historyMetric}>
                      <Text
                        style={[
                          typography.section,
                          { color: colors.text, fontVariant: ['tabular-nums'] },
                        ]}
                      >
                        {row.length ?? '—'}
                      </Text>
                      <Eyebrow>{row.length ? 'days' : 'open'}</Eyebrow>
                    </View>
                  </PressableScale>
                  {index < comparison.length - 1 ? <Divider /> : null}
                </View>
              ))}
            </View>
          )}
        </Reveal>

        <Reveal index={4}>
          <View style={[styles.footNote, { borderColor: colors.border }]}>
            <AppIcon
              name="lock-closed-outline"
              size={13}
              color={colors.textTertiary}
            />
            <DataText>every day here is saved to your account</DataText>
          </View>
        </Reveal>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  statStrip: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: radii.full,
  },
  jump: {
    marginLeft: 'auto',
    minHeight: 30,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    marginTop: spacing.xxxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 5,
    minHeight: 62,
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCompact: {
    width: 36,
    height: 36,
  },
  marker: {
    width: 5,
    height: 5,
    borderRadius: radii.full,
    marginTop: 5,
  },
  ovulationMarker: {
    width: 7,
    height: 7,
  },
  legend: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendTile: {
    width: 14,
    height: 14,
    borderRadius: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
    marginHorizontal: 3.5,
  },
  sectionSpace: {
    marginTop: spacing.mega,
    marginBottom: spacing.lg,
  },
  historyRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyIndex: {
    width: 26,
  },
  historyMetric: {
    alignItems: 'flex-end',
    minWidth: 46,
  },
  footNote: {
    marginTop: spacing.giant,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
