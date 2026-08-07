import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  Body,
  Caption,
  Card,
  Screen,
  SectionTitle,
  Title,
} from '@/components/ui';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { useLumaStore } from '@/store/lumaStore';
import { isMeaningfulBleeding } from '@/engine/cycle';
import { addLocalDays, toLocalDateString } from '@/utils/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing, typography } from '@/theme/tokens';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent } = useTheme();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const logs = useLumaStore((s) => s.dailyLogs);
  const fertilityEnabled = useLumaStore((s) => s.profile.fertilityEnabled);
  const { episodes, prediction, comparison } = useCycleIntelligence();

  const predictedSet = useMemo(() => {
    const set = new Set<string>();
    if (!prediction) return set;
    let d = prediction.lowerBound;
    while (d <= prediction.upperBound) {
      set.add(d);
      d = addLocalDays(d, 1);
    }
    return set;
  }, [prediction]);

  const periodSet = useMemo(() => {
    const set = new Set<string>();
    for (const e of episodes) {
      const end = e.endDate ?? addLocalDays(e.startDate, 4);
      let d = e.startDate;
      while (d <= end) {
        set.add(d);
        d = addLocalDays(d, 1);
      }
    }
    // Also mark logged meaningful flow
    for (const [date, log] of Object.entries(logs)) {
      if (isMeaningfulBleeding(log.flow)) set.add(date);
    }
    return set;
  }, [episodes, logs]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const today = toLocalDateString();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: 120,
          paddingHorizontal: spacing.xxl,
        }}
      >
        <Title>Calendar</Title>
        <View style={styles.monthNav}>
          <Pressable
            onPress={() => setMonth((m) => addMonths(m, -1))}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={styles.navHit}
          >
            <Body style={{ fontSize: 22 }}>‹</Body>
          </Pressable>
          <SectionTitle>{format(month, 'MMMM yyyy')}</SectionTitle>
          <Pressable
            onPress={() => setMonth((m) => addMonths(m, 1))}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={styles.navHit}
          >
            <Body style={{ fontSize: 22 }}>›</Body>
          </Pressable>
        </View>

        <View style={styles.weekHeader}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Caption key={`${d}-${i}`} style={styles.weekLabel}>
              {d}
            </Caption>
          ))}
        </View>

        <View style={styles.grid}>
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const inMonth = isSameMonth(day, month);
            const isPeriod = periodSet.has(key);
            const isPredicted = !isPeriod && predictedSet.has(key);
            const hasSymptoms = !!(
              logs[key]?.symptoms?.length ||
              logs[key]?.mood ||
              logs[key]?.energy
            );
            const isToday = key === today;

            const markerBits = [
              isPeriod ? 'period logged' : null,
              isPredicted ? 'predicted period' : null,
              hasSymptoms ? 'symptoms logged' : null,
            ].filter(Boolean);
            const a11y = `${format(day, 'MMMM d')}${
              markerBits.length ? `, ${markerBits.join(', ')}` : ''
            }`;

            return (
              <Pressable
                key={key}
                onPress={() => router.push(`/day/${key}`)}
                style={styles.cell}
                accessibilityRole="button"
                accessibilityLabel={a11y}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isPeriod && {
                      backgroundColor: colors.period,
                    },
                    isPredicted && {
                      borderWidth: 1.5,
                      borderColor: colors.predicted,
                    },
                    isToday && !isPeriod && {
                      backgroundColor: colors.surfaceMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.label,
                      {
                        color: isPeriod
                          ? '#FFFFFF'
                          : inMonth
                            ? colors.text
                            : colors.textTertiary,
                      },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
                <Caption
                  style={{
                    marginTop: 2,
                    fontSize: 10,
                    lineHeight: 12,
                    color: hasSymptoms
                      ? accent
                      : isPeriod
                        ? colors.period
                        : isPredicted
                          ? colors.predicted
                          : 'transparent',
                  }}
                >
                  {isPeriod ? 'P' : isPredicted ? '○' : hasSymptoms ? '·' : ' '}
                </Caption>
              </Pressable>
            );
          })}
        </View>

        <Caption style={{ marginTop: spacing.lg }}>
          P = logged period · ○ = predicted · · = symptoms logged
          {fertilityEnabled
            ? ' · Fertile estimates are optional and not contraception'
            : ''}
        </Caption>

        <Card style={{ marginTop: spacing.xxl }}>
          <SectionTitle>Cycle history</SectionTitle>
          {comparison.length === 0 ? (
            <Body muted style={{ marginTop: spacing.sm }}>
              Your cycle history will appear as you track periods.
            </Body>
          ) : (
            comparison.map((row) => (
              <View key={row.startDate} style={styles.historyRow}>
                <Body>{format(parseISO(row.startDate), 'MMM yyyy')}</Body>
                <Body muted>
                  {row.length ? `${row.length} days` : 'In progress'}
                  {row.periodLength ? ` · ${row.periodLength}d period` : ''}
                </Body>
                <Caption>{row.mainDifference}</Caption>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    marginTop: spacing.xl,
  },
  weekLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRow: {
    marginTop: spacing.lg,
    gap: 2,
  },
});
