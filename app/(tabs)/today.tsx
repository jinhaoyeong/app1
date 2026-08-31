import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import {
  AppIcon,
  Body,
  Caption,
  DataText,
  DisplayNumber,
  Eyebrow,
  IconButton,
  Pill,
  PrimaryButton,
  Screen,
  SectionRule,
} from '@/components/ui';
import { CycleDial } from '@/components/CycleDial';
import { TAB_SCROLL_INSET } from '@/components/TabBar';
import { CycleMapPanel } from '@/components/CycleMap';
import { ConceptionCard, ConcernCard } from '@/components/GuidanceCards';
import { WhenToSeekHelp } from '@/components/WhenToSeekHelp';
import { PhaseAura } from '@/components/PhaseAura';
import { PressableScale, Reveal } from '@/components/motion';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { useLumaStore } from '@/store/lumaStore';
import { greetingForNow, toLocalDateString } from '@/utils/dates';
import { playImpactHaptic } from '@/utils/haptics';
import { MOOD_OPTIONS, ENERGY_OPTIONS } from '@/data/catalog';
import { MOOD_REPLY, phaseGreeting } from '@/data/voice';
import { screenTopInset, TAB_SCREEN_TOP_GAP } from '@/navigation/tabRoute';
import { radii, spacing, typography, type PhaseKey } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { MoodLevel, PersonalPattern } from '@/types';
import {
  dueFromPlan,
  localInstant,
  lockScreenIsDiscreet,
  type DueReminder,
} from '@/notifications/plan';
import { dismissDue, loadDismissedDue } from '@/notifications/dueDismiss';
import { patternMeta } from '@/engine/patterns';

/** The masthead: brand and profile only. The cycle day lives in the dial. */
function Masthead({
  name,
  onOpenProfile,
}: {
  name?: string;
  onOpenProfile: () => void;
}) {
  const { colors, accent, accentGlow } = useTheme();
  return (
    <View style={styles.masthead}>
      <View style={styles.brandLockup}>
        <View style={[styles.brandMark, { backgroundColor: accent }]}>
          <View style={[styles.brandCore, { backgroundColor: accentGlow }]} />
        </View>
        <Text
          style={[
            typography.eyebrow,
            {
              color: colors.text,
              fontSize: 13,
              lineHeight: 16,
              letterSpacing: 3,
              includeFontPadding: false,
            },
          ]}
        >
          LUMA
        </Text>
      </View>
      <View style={styles.mastheadRight}>
        <IconButton
          name="person-outline"
          onPress={onOpenProfile}
          accessibilityLabel="Open your profile"
          size={36}
        />
      </View>
    </View>
  );
}

/** The human opening: who you are, and a read on where you are. */
function Greeting({ name, phase }: { name?: string; phase: PhaseKey }) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[typography.hero, { color: colors.text }]}>
        {greetingForNow()}
        {name ? `,` : '.'}
      </Text>
      {name ? (
        <Text style={[typography.heroItalic, { color: colors.text }]}>
          {name}.
        </Text>
      ) : null}
      <Text
        style={[
          typography.bodyItalic,
          { color: colors.textSecondary, marginTop: spacing.sm },
        ]}
      >
        {phaseGreeting(phase)}
      </Text>
    </View>
  );
}

/** How full each mood's mark reads, so the row is a scale and not five words. */
const MOOD_WEIGHT: Record<MoodLevel, number> = {
  rough: 1,
  low: 2,
  okay: 3,
  good: 4,
  great: 5,
};

/**
 * Tap a mood straight from Today — the shortest possible path to a log, and
 * the one place the app answers back rather than just recording.
 */
function QuickMood({ date }: { date: string }) {
  const { colors, accent, tint } = useTheme();
  const current = useLumaStore((s) => s.dailyLogs[date]?.mood);
  const upsert = useLumaStore((s) => s.upsertDailyLog);

  const pick = async (value: MoodLevel) => {
    const saved = await upsert(date, {
      mood: current === value ? undefined : value,
    });
    if (!saved) return;
    playImpactHaptic('light');
  };

  return (
    <View>
      <View style={styles.quickRow}>
        {MOOD_OPTIONS.map((m) => {
          const selected = current === m.value;
          const weight = MOOD_WEIGHT[m.value];
          return (
            <PressableScale
              key={m.value}
              onPress={() => pick(m.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Mood: ${m.label}`}
              scaleTo={0.9}
              style={[
                styles.quickChip,
                {
                  backgroundColor: selected ? accent : colors.surface,
                  borderColor: selected ? accent : colors.border,
                },
              ]}
            >
              {/* A rising mark makes the row read as a scale at a glance —
                  the height spread has to be wide or it just looks like
                  five identical ticks. */}
              <View style={styles.moodMarkSlot}>
                <View
                  style={[
                    styles.moodMark,
                    {
                      height: 3 + weight * 3.6,
                      backgroundColor: selected ? colors.accentInk : tint(0.55),
                    },
                  ]}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  typography.label,
                  {
                    color: selected ? colors.accentInk : colors.textSecondary,
                    fontSize: 12,
                    lineHeight: 15,
                    includeFontPadding: false,
                  },
                ]}
              >
                {m.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      {current ? (
        <Reveal index={0} distance={6}>
          <Text
            style={[
              typography.bodyItalic,
              { color: colors.textSecondary, marginTop: spacing.md },
            ]}
          >
            {MOOD_REPLY[current]}
          </Text>
        </Reveal>
      ) : null}
    </View>
  );
}

function UpcomingRead({
  patterns,
  onOpen,
}: {
  patterns: PersonalPattern[];
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  if (!patterns.length) return null;
  return (
    <View style={{ marginTop: spacing.xl }}>
      <Caption>Often logged in the next few days — not a forecast</Caption>
      {patterns.map((pattern) => (
        <PressableScale
          key={pattern.id}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={pattern.title}
          scaleTo={0.99}
          style={styles.upcomingRow}
        >
          <Text
            style={[typography.bodyMedium, { color: colors.text, flex: 1 }]}
          >
            {pattern.title}
          </Text>
          <DataText>{patternMeta(pattern)}</DataText>
        </PressableScale>
      ))}
    </View>
  );
}

function DueCards({
  items,
  onOpen,
  onDismiss,
}: {
  items: DueReminder[];
  onOpen: (href: DueReminder['href']) => void;
  onDismiss: (id: string) => void;
}) {
  const { colors, accent } = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ marginBottom: spacing.xl, gap: spacing.sm }}>
      {items.map((item) => (
        <View
          key={item.id}
          style={[styles.dueCard, { borderColor: colors.border }]}
        >
          <PressableScale
            onPress={() => onOpen(item.href)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            scaleTo={0.99}
            style={{ flex: 1, minWidth: 0 }}
          >
            <Text style={[typography.bodyMedium, { color: colors.text }]}>
              {item.title}
            </Text>
            <Caption style={{ marginTop: 3 }}>{item.body}</Caption>
          </PressableScale>
          <PressableScale
            onPress={() => onDismiss(item.id)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss for today"
            scaleTo={0.94}
            hitSlop={8}
            style={styles.dueDismiss}
          >
            <AppIcon name="close" size={16} color={accent} />
          </PressableScale>
        </View>
      ))}
    </View>
  );
}

function TodayLogRow({
  logged,
  energyLabel,
  onPress,
}: {
  logged: boolean;
  energyLabel?: string;
  onPress: () => void;
}) {
  const { colors, accent } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={logged ? "Edit today's log" : 'Log today'}
      scaleTo={0.985}
      style={[styles.logRow, { borderColor: colors.border }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>
          {logged ? 'Add more detail' : 'Log flow, energy, symptoms'}
        </Text>
        {logged && energyLabel ? (
          <Caption style={{ marginTop: 3 }}>
            {`Energy ${energyLabel.toLowerCase()}`}
          </Caption>
        ) : null}
      </View>
      <View style={[styles.logGo, { backgroundColor: accent }]}>
        <AppIcon
          name={logged ? 'create-outline' : 'add'}
          size={19}
          color={colors.accentInk}
        />
      </View>
    </PressableScale>
  );
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent, tint } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const isDesktop = width >= 1200;
  const today = toLocalDateString();

  const name = useLumaStore((s) => s.profile.displayName);
  const periodLength = useLumaStore((s) => s.profile.usualPeriodLength ?? 1);
  const {
    cycleDay,
    cycleStart,
    prediction,
    dataCoverageText,
    phase,
    cycleMap,
    todayInsight,
    todayLog,
    recommendations,
    baseline,
    fertilitySafety,
    fertilityVisible,
    predictionSafety,
    conception,
    concerns,
    upcoming,
    logs,
    episodes,
    patterns,
  } = useCycleIntelligence();

  const notifications = useLumaStore((s) => s.notifications);
  const discreetMode = useLumaStore((s) => s.appearance.discreetMode);
  const userId = useLumaStore((s) => s.cloudUserId);
  const [dismissState, setDismissState] = useState<{
    userId: string | null;
    asOf: string;
    ids: string[];
  }>({ userId: null, asOf: today, ids: [] });

  useEffect(() => {
    if (!userId) return;
    const asOf = today;
    let cancelled = false;
    void loadDismissedDue(userId, asOf).then((ids) => {
      if (!cancelled) setDismissState({ userId, asOf, ids });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, today]);

  const dismissedDue =
    dismissState.userId === (userId ?? null) && dismissState.asOf === today
      ? dismissState.ids
      : [];

  const dueItems = dueFromPlan({
    prefs: notifications,
    prediction,
    discreet: lockScreenIsDiscreet(
      discreetMode,
      notifications.showDetailedText,
    ),
    now: localInstant(today, 12),
    todayLogged: !!todayLog,
    asOf: today,
  }).filter((item) => !dismissedDue.includes(item.id));

  const energy = ENERGY_OPTIONS.find((e) => e.value === todayLog?.energy);
  const tip = recommendations[0];
  const hasWindow = !!prediction && prediction.confidenceBand !== 'learning';

  const lower = Math.max(0, prediction?.daysUntilLower ?? 0);
  const upper = Math.max(lower, prediction?.daysUntilUpper ?? 0);
  const windowNumber = lower === upper ? `${lower}` : `${lower}–${upper}`;
  const windowDates = prediction
    ? `${format(parseISO(prediction.lowerBound), 'MMM d')} → ${format(
        parseISO(prediction.upperBound),
        'MMM d',
      )}`
    : '';
  const spread = prediction ? Math.round((upper - lower) / 2) : undefined;

  const contextualHref = todayInsight.actionHref;
  const hasContextualAction = !!contextualHref && contextualHref !== '/log';

  const dismissDueItem = async (id: string) => {
    if (!userId) {
      setDismissState((prev) => ({
        userId: null,
        asOf: today,
        ids: [...new Set([...prev.ids, id])],
      }));
      return;
    }
    const ids = await dismissDue(userId, today, id);
    setDismissState({ userId, asOf: today, ids });
  };

  return (
    <Screen>
      <PhaseAura phase={phase as PhaseKey} height={isWide ? 420 : 560} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isWide && styles.contentWide,
          {
            paddingTop: screenTopInset(
              insets.top,
              Platform.OS === 'web',
              isWide ? spacing.xl : TAB_SCREEN_TOP_GAP,
              !(isWide && Platform.OS === 'web'),
            ),
            paddingBottom: TAB_SCROLL_INSET,
            paddingHorizontal: isDesktop
              ? spacing.xxl
              : isWide
                ? spacing.xxxl
                : spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Reveal index={0}>
          <Masthead
            name={name}
            onOpenProfile={() => router.push('/(tabs)/you')}
          />
        </Reveal>

        <Reveal index={1} style={styles.intro}>
          <Greeting name={name} phase={phase as PhaseKey} />
          <View style={styles.cycleInfo}>
            {hasWindow ? (
              <>
                <Eyebrow color={accent}>Next window</Eyebrow>
                <View style={styles.displayRow}>
                  <DisplayNumber style={styles.displayNumber}>
                    {windowNumber}
                  </DisplayNumber>
                  <View style={styles.displayUnit}>
                    <Text
                      style={[
                        typography.section,
                        { color: colors.textSecondary },
                      ]}
                    >
                      days
                    </Text>
                    <Caption style={{ marginTop: 2 }}>away</Caption>
                  </View>
                </View>
                <View
                  style={[styles.metaStrip, { borderColor: colors.border }]}
                >
                  <DataText color={colors.text}>{windowDates}</DataText>
                  <View
                    style={[styles.metaDot, { backgroundColor: colors.border }]}
                  />
                  <DataText>
                    {dataCoverageText?.toLowerCase()}
                    {spread !== undefined ? ` ±${spread}d` : ''}
                  </DataText>
                </View>
                <Body muted style={{ marginTop: spacing.md, maxWidth: 460 }}>
                  {prediction?.explanation}
                </Body>
              </>
            ) : (
              <>
                <Caption>Building your baseline</Caption>
                {!predictionSafety.canShow ? (
                  <PressableScale
                    onPress={() => router.push('/health-profile')}
                    accessibilityRole="button"
                    accessibilityLabel="Review why period timing is hidden"
                    scaleTo={0.97}
                    style={styles.contextLink}
                  >
                    <Caption style={{ color: accent }}>
                      {predictionSafety.title}
                    </Caption>
                    <AppIcon name="arrow-forward" size={14} color={accent} />
                  </PressableScale>
                ) : (
                  <Caption style={{ marginTop: spacing.sm }}>
                    {baseline.cycleCount === 0
                      ? cycleStart
                        ? '1 start on file — a range needs more'
                        : 'Start with the day your period begins'
                      : `${baseline.cycleCount} completed cycle${
                          baseline.cycleCount === 1 ? '' : 's'
                        } on file`}
                  </Caption>
                )}
              </>
            )}
          </View>
        </Reveal>

        <View style={[styles.stage, isWide && styles.stageWide]}>
          <View style={isWide ? styles.heroDial : styles.dialWrap}>
            <Reveal index={2}>
              <View
                style={[
                  styles.dialPanel,
                  { borderColor: colors.border, backgroundColor: tint(0.05) },
                ]}
              >
                <View style={styles.dialHeader}>
                  <Eyebrow>Where you are</Eyebrow>
                </View>
                <CycleDial
                  cycleDay={cycleDay}
                  cycleLength={baseline.averageCycleLength ?? 28}
                  periodLength={periodLength}
                  cycleStart={cycleStart}
                  logs={logs}
                  episodes={episodes}
                  patterns={patterns}
                  asOf={today}
                  onOpenDay={(date) => router.push(`/day/${date}` as never)}
                  onLogDay={(date) => router.push(`/log?date=${date}` as never)}
                  fertilityEnabled={fertilityVisible}
                  fertilitySafety={fertilitySafety}
                  onResolveFertility={() => router.push('/health-profile')}
                  fertileWindow={
                    cycleMap
                      ? [
                          cycleMap.fertileWindowCycleDayStart,
                          cycleMap.fertileWindowCycleDayEnd,
                        ]
                      : undefined
                  }
                  ovulationWindow={
                    cycleMap
                      ? [
                          cycleMap.ovulationWindowCycleDayStart,
                          cycleMap.ovulationWindowCycleDayEnd,
                        ]
                      : undefined
                  }
                  postOvulationWindow={
                    cycleMap
                      ? [
                          cycleMap.postOvulationWindowCycleDayStart,
                          cycleMap.postOvulationWindowCycleDayEnd,
                        ]
                      : undefined
                  }
                />
              </View>
            </Reveal>
          </View>
          {isWide ? (
            <View style={styles.heroAside}>
              <Reveal index={3}>
                <CycleMapPanel
                  cycleMap={cycleMap}
                  fertilityEnabled={fertilityVisible}
                  fertilitySafety={fertilitySafety}
                  onEnableFertility={() => router.push('/health-profile')}
                />
                <View style={{ marginTop: spacing.xl }}>
                  <DueCards
                    items={dueItems}
                    onOpen={(href) => router.push(href)}
                    onDismiss={(id) => void dismissDueItem(id)}
                  />
                  <SectionRule
                    label="A useful read"
                    style={styles.sectionSpaceWide}
                  />
                  <View style={styles.insightBlock}>
                    <View
                      style={[styles.signalBar, { backgroundColor: accent }]}
                    />
                    <View style={styles.insightCopy}>
                      <Text style={[typography.title, { color: colors.text }]}>
                        {todayInsight.title}
                      </Text>
                      <Body muted style={{ marginTop: spacing.md }}>
                        {todayInsight.body}
                      </Body>
                      {todayInsight.meta ? (
                        <DataText style={{ marginTop: spacing.md }}>
                          {todayInsight.meta}
                        </DataText>
                      ) : null}
                      {hasContextualAction ? (
                        <View
                          style={{
                            marginTop: spacing.xl,
                            alignSelf: 'flex-start',
                          }}
                        >
                          <PrimaryButton
                            label={todayInsight.actionLabel ?? 'Open'}
                            variant="ghost"
                            onPress={() => router.push(contextualHref as never)}
                            icon="arrow-forward"
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <UpcomingRead
                    patterns={
                      todayInsight.title === 'What usually happens next'
                        ? upcoming.slice(1)
                        : upcoming
                    }
                    onOpen={() => router.push('/insights')}
                  />
                  <TodayLogRow
                    logged={!!todayLog}
                    energyLabel={energy?.label}
                    onPress={() => router.push('/log')}
                  />
                  <View style={{ marginTop: spacing.lg }}>
                    <WhenToSeekHelp compact />
                  </View>
                  <SectionRule
                    label="How is today?"
                    style={styles.asideMood}
                    right={
                      todayLog ? <Pill label="Logged" icon="checkmark" /> : null
                    }
                  />
                  <QuickMood date={today} />
                  <View
                    style={[
                      styles.footNote,
                      {
                        borderColor: colors.border,
                        marginTop: spacing.xl,
                      },
                    ]}
                  >
                    <DataText>
                      estimates come from your own history — not certainties
                    </DataText>
                  </View>
                </View>
              </Reveal>
            </View>
          ) : null}
        </View>

        {isWide ? null : (
          <View>
            <Reveal index={3} style={styles.mapWrap}>
              <CycleMapPanel
                cycleMap={cycleMap}
                fertilityEnabled={fertilityVisible}
                fertilitySafety={fertilitySafety}
                onEnableFertility={() => router.push('/health-profile')}
              />
            </Reveal>

            <Reveal index={4}>
              <DueCards
                items={dueItems}
                onOpen={(href) => router.push(href)}
                onDismiss={(id) => void dismissDueItem(id)}
              />
              <SectionRule label="A useful read" style={styles.sectionSpace} />
              <View style={styles.insightBlock}>
                <View style={[styles.signalBar, { backgroundColor: accent }]} />
                <View style={styles.insightCopy}>
                  <Text style={[typography.title, { color: colors.text }]}>
                    {todayInsight.title}
                  </Text>
                  <Body muted style={{ marginTop: spacing.md }}>
                    {todayInsight.body}
                  </Body>
                  {todayInsight.meta ? (
                    <DataText style={{ marginTop: spacing.md }}>
                      {todayInsight.meta}
                    </DataText>
                  ) : null}
                  {hasContextualAction ? (
                    <View
                      style={{ marginTop: spacing.xl, alignSelf: 'flex-start' }}
                    >
                      <PrimaryButton
                        label={todayInsight.actionLabel ?? 'Open'}
                        variant="ghost"
                        onPress={() => router.push(contextualHref as never)}
                        icon="arrow-forward"
                      />
                    </View>
                  ) : null}
                </View>
              </View>
              <UpcomingRead
                patterns={
                  todayInsight.title === 'What usually happens next'
                    ? upcoming.slice(1)
                    : upcoming
                }
                onOpen={() => router.push('/insights')}
              />
            </Reveal>
          </View>
        )}

        {conception ? (
          <Reveal index={5} style={styles.mapWrap}>
            <ConceptionCard
              guidance={conception}
              onReviewProfile={() => router.push('/health-profile')}
            />
          </Reveal>
        ) : null}

        {concerns.map((concern) => (
          <Reveal key={concern.id} index={5} style={styles.mapWrap}>
            <ConcernCard
              concern={concern}
              onAction={(href) => router.push(href as never)}
            />
          </Reveal>
        ))}

        {isWide ? null : (
          <Reveal index={6}>
            <SectionRule
              label="How is today?"
              style={styles.sectionSpace}
              right={todayLog ? <Pill label="Logged" icon="checkmark" /> : null}
            />
            <QuickMood date={today} />
            <TodayLogRow
              logged={!!todayLog}
              energyLabel={energy?.label}
              onPress={() => router.push('/log')}
            />
          </Reveal>
        )}

        {isWide ? null : (
          <Reveal index={7}>
            <View style={{ marginTop: spacing.mega }}>
              <WhenToSeekHelp compact />
            </View>
          </Reveal>
        )}

        {tip ? (
          <Reveal index={7}>
            <SectionRule
              label="One small preparation"
              style={styles.sectionSpace}
              right={<Caption>Optional</Caption>}
            />
            <PressableScale
              onPress={() => router.push('/preparation')}
              accessibilityRole="button"
              accessibilityLabel="Open period preparation"
              scaleTo={0.99}
              dimTo={0.75}
              style={styles.tipRow}
            >
              <View style={[styles.tipMark, { backgroundColor: tint(0.14) }]}>
                <AppIcon name="leaf-outline" size={18} color={accent} />
              </View>
              <Body style={{ flex: 1 }}>{tip}</Body>
              <AppIcon
                name="chevron-forward"
                size={18}
                color={colors.textTertiary}
              />
            </PressableScale>
          </Reveal>
        ) : null}

        {isWide ? null : (
          <Reveal index={8}>
            <View
              style={[
                styles.footNote,
                {
                  borderColor: colors.border,
                  marginTop: spacing.giant,
                },
              ]}
            >
              <DataText>
                estimates come from your own history — not certainties
              </DataText>
            </View>
          </Reveal>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
  },
  contentWide: {
    maxWidth: 1600,
  },
  masthead: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandLockup: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCore: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  mastheadRight: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  intro: {
    marginTop: spacing.xxl,
  },
  cycleInfo: {
    marginTop: spacing.md,
  },
  contextLink: {
    minHeight: 44,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stage: {
    marginTop: spacing.xxl,
  },
  stageWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xxl,
  },
  heroDial: {
    flex: 1,
    minWidth: 0,
    maxWidth: 560,
  },
  heroAside: {
    flex: 1,
    minWidth: 0,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  displayNumber: {
    marginTop: spacing.md,
  },
  displayUnit: {
    paddingBottom: spacing.sm,
  },
  metaStrip: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: radii.full,
  },
  dialWrap: {
    width: '100%',
  },
  dialPanel: {
    padding: spacing.xxxl,
    borderRadius: radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mapWrap: {
    marginTop: spacing.xxxl,
  },
  dialHeader: {
    marginBottom: spacing.lg,
  },
  sectionSpace: {
    marginTop: spacing.mega,
    marginBottom: spacing.xl,
  },
  sectionSpaceWide: {
    marginTop: 0,
    marginBottom: spacing.lg,
  },
  asideMood: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  insightBlock: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  signalBar: {
    width: 3,
    borderRadius: radii.full,
  },
  insightCopy: {
    flex: 1,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    gap: 6,
  },
  quickChip: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingHorizontal: 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  moodMarkSlot: {
    height: 22,
    justifyContent: 'flex-end',
  },
  moodMark: {
    width: 4,
    borderRadius: radii.full,
  },
  logRow: {
    marginTop: spacing.lg,
    minHeight: 72,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  logGo: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tipMark: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footNote: {
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  dueCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dueDismiss: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingRow: {
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    gap: 2,
  },
});
