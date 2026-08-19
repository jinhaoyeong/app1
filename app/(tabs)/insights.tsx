import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import {
  AppIcon,
  Body,
  Caption,
  DataText,
  Divider,
  EmptyNote,
  Eyebrow,
  Metric,
  PageHeader,
  Pill,
  PrimaryButton,
  Screen,
  SectionRule,
  SectionTitle,
} from '@/components/ui';
import { CycleBars, RangeRail, StrengthMeter } from '@/components/DataMarks';
import { TAB_SCROLL_INSET } from '@/components/TabBar';
import { PhaseAura } from '@/components/PhaseAura';
import { Reveal } from '@/components/motion';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { patternMeta } from '@/engine/patterns';
import { completedCycleLengths } from '@/engine/cycle';
import { screenTopInset } from '@/navigation/tabRoute';
import { radii, spacing, typography, type PhaseKey } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const STRENGTH_FILL: Record<string, number> = {
  insufficient: 1,
  possible: 2,
  repeating: 3,
  strong: 4,
};

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent, tint } = useTheme();
  const { baseline, patterns, changes, comparison, episodes, phase } =
    useCycleIntelligence();

  const recent = useMemo(() => {
    const lengths = completedCycleLengths(episodes).slice(-6);
    const starts = [...episodes]
      .map((e) => e.startDate)
      .sort()
      .slice(-lengths.length - 1);
    return {
      values: lengths,
      labels: lengths.map((_, i) =>
        starts[i] ? format(parseISO(starts[i]), 'MMM') : '',
      ),
    };
  }, [episodes]);

  return (
    <Screen>
      {/* A lighter wash than Today's, so the tabs feel like one world. */}
      <PhaseAura phase={phase as PhaseKey} height={300} intensity={0.55} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: screenTopInset(insets.top, Platform.OS === 'web'),
            paddingBottom: TAB_SCROLL_INSET,
            paddingHorizontal: spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Reveal index={0}>
          <PageHeader
            eyebrow="From your own history"
            title="Insights"
            subtitle="What repeats or changes in your own logs — described, never diagnosed."
          />
        </Reveal>

        <Reveal index={1}>
          <SectionRule
            label="Your baseline"
            style={styles.sectionSpace}
            right={
              <Pill
                label={baseline.ready ? 'Ready' : 'Learning'}
                color={baseline.ready ? accent : colors.textTertiary}
              />
            }
          />
          <View
            style={[
              styles.baselinePanel,
              { borderColor: colors.border, backgroundColor: tint(0.06) },
            ]}
          >
            <View style={styles.baselineTop}>
              <Text
                style={[
                  typography.hero,
                  { color: colors.text, fontVariant: ['tabular-nums'] },
                ]}
              >
                {baseline.cycleLengthRange
                  ? `${baseline.cycleLengthRange[0]}–${baseline.cycleLengthRange[1]}`
                  : '—'}
              </Text>
              <View style={{ paddingBottom: 6 }}>
                <Text
                  style={[typography.section, { color: colors.textSecondary }]}
                >
                  days
                </Text>
              </View>
            </View>
            <Body muted style={{ marginTop: spacing.sm }}>
              {baseline.message}
            </Body>
            <View style={{ marginTop: spacing.xxl }}>
              <RangeRail
                range={baseline.cycleLengthRange}
                average={baseline.averageCycleLength}
              />
            </View>
            <View style={[styles.factRow, { borderTopColor: colors.border }]}>
              <Metric
                value={
                  baseline.averageCycleLength
                    ? `${baseline.averageCycleLength}`
                    : '—'
                }
                label="average"
              />
              <Metric
                value={
                  baseline.medianCycleLength
                    ? `${baseline.medianCycleLength}`
                    : '—'
                }
                label="median"
              />
              <Metric
                value={
                  baseline.cycleVariation !== undefined
                    ? `±${baseline.cycleVariation}`
                    : '—'
                }
                label="variation"
              />
              <Metric value={`${baseline.cycleCount}`} label="cycles" />
            </View>
          </View>
        </Reveal>

        {recent.values.length >= 2 ? (
          <Reveal index={2}>
            <SectionRule
              label="Recent cycles"
              style={styles.sectionSpace}
              right={<DataText>{`n=${recent.values.length}`}</DataText>}
            />
            <CycleBars
              values={recent.values}
              labels={recent.labels}
              average={baseline.averageCycleLength}
            />
            <Caption style={{ marginTop: spacing.lg }}>
              Each bar is one completed cycle, oldest on the left. The most
              recent is highlighted.
            </Caption>
          </Reveal>
        ) : null}

        <Reveal index={3}>
          <SectionRule
            label="Patterns"
            style={styles.sectionSpace}
            right={
              <DataText>
                {patterns.length ? `${patterns.length} found` : 'building'}
              </DataText>
            }
          />
          {patterns.length === 0 ? (
            <EmptyNote
              icon="scan-outline"
              title="Your history is still taking shape"
              body="Keep logging when something feels worth noting. Patterns become useful after several cycles."
            />
          ) : (
            patterns.map((p, i) => (
              <View
                key={p.id}
                style={[
                  styles.patternBlock,
                  {
                    borderTopColor: colors.border,
                    borderBottomColor: colors.border,
                    borderBottomWidth:
                      i === patterns.length - 1 ? StyleSheet.hairlineWidth : 0,
                  },
                ]}
              >
                <View style={styles.patternTop}>
                  <StrengthMeter
                    filled={STRENGTH_FILL[p.strength] ?? 1}
                    total={4}
                    label={p.strength}
                  />
                </View>
                <SectionTitle style={{ marginTop: spacing.md }}>
                  {p.title}
                </SectionTitle>
                <Body muted style={{ marginTop: spacing.sm }}>
                  {p.body}
                </Body>
                <DataText style={{ marginTop: spacing.md }}>
                  {patternMeta(p).toLowerCase()}
                </DataText>
              </View>
            ))
          )}
        </Reveal>

        <Reveal index={4}>
          <SectionRule label="Changes" style={styles.sectionSpace} />
          {changes.length === 0 ? (
            <EmptyNote
              icon="checkmark-circle-outline"
              title="Nothing different from your recent pattern"
              body="Luma compares each cycle against your own history, not an average."
            />
          ) : (
            changes.map((c, i) => (
              <View
                key={c.id}
                style={[
                  styles.changeBlock,
                  { borderTopColor: colors.border },
                  i === 0 && { borderTopWidth: 0, paddingTop: 0 },
                ]}
              >
                <View style={styles.changeHead}>
                  <View
                    style={[styles.changeMark, { backgroundColor: tint(0.16) }]}
                  >
                    <AppIcon name="swap-vertical" size={15} color={accent} />
                  </View>
                  <SectionTitle style={{ flex: 1 }}>{c.title}</SectionTitle>
                </View>
                <Body muted style={{ marginTop: spacing.sm }}>
                  {c.body}
                </Body>
              </View>
            ))
          )}
        </Reveal>

        <Reveal index={5}>
          <SectionRule label="Compare cycles" style={styles.sectionSpace} />
          {comparison.length === 0 ? (
            <EmptyNote
              icon="git-compare-outline"
              title="Not enough cycles yet to compare"
            />
          ) : (
            comparison.slice(0, 4).map((row, index) => (
              <View key={row.startDate}>
                <View style={styles.comparisonRow}>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: '700' }}>
                      {format(parseISO(row.startDate), 'MMM yyyy')}
                    </Body>
                    <Caption style={{ marginTop: 3 }}>
                      {row.mainDifference ?? 'No comparison note yet'}
                    </Caption>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        typography.section,
                        { color: colors.text, fontVariant: ['tabular-nums'] },
                      ]}
                    >
                      {row.length ?? '—'}
                    </Text>
                    <Eyebrow>
                      {row.periodLength
                        ? `${row.periodLength}d period`
                        : 'days'}
                    </Eyebrow>
                  </View>
                </View>
                {index < Math.min(comparison.length, 4) - 1 ? (
                  <Divider />
                ) : null}
              </View>
            ))
          )}
        </Reveal>

        <Reveal index={6}>
          <View style={{ marginTop: spacing.mega }}>
            <PrimaryButton
              label="Create health summary"
              variant="secondary"
              onPress={() => router.push('/health-summary')}
              icon="document-text-outline"
            />
            <Caption style={{ marginTop: spacing.md, textAlign: 'center' }}>
              A calm overview you can bring to a healthcare visit.
            </Caption>
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
  sectionSpace: {
    marginTop: spacing.mega,
    marginBottom: spacing.lg,
  },
  baselinePanel: {
    borderRadius: radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xxxl,
  },
  baselineTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  factRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  patternBlock: {
    paddingVertical: spacing.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  patternTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeBlock: {
    paddingVertical: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  changeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  changeMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
});
