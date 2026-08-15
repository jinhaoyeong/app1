import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import {
  AppIcon,
  Body,
  Caption,
  DataText,
  DisplayText,
  Eyebrow,
  IconButton,
  Pill,
  PrimaryButton,
  Screen,
  SectionRule,
} from '@/components/ui';
import { CycleRibbon } from '@/components/CycleRibbon';
import { CycleMapPanel } from '@/components/CycleMap';
import { WhenToSeekHelp } from '@/components/WhenToSeekHelp';
import { PhaseAura } from '@/components/PhaseAura';
import { PressableScale, Reveal } from '@/components/motion';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { useLumaStore } from '@/store/lumaStore';
import { greetingForNow, toLocalDateString } from '@/utils/dates';
import { MOOD_OPTIONS, ENERGY_OPTIONS } from '@/data/catalog';
import { MOOD_REPLY, phaseGreeting } from '@/data/voice';
import { radii, spacing, typography, type PhaseKey } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { MoodLevel } from '@/types';

/** The masthead: brand, greeting, and where you are, in one line of sight. */
function Masthead({
  name,
  cycleDay,
  onOpenProfile,
}: {
  name?: string;
  cycleDay?: number;
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
            { color: colors.text, fontSize: 13, letterSpacing: 3 },
          ]}
        >
          LUMA
        </Text>
      </View>
      <View style={styles.mastheadRight}>
        {cycleDay ? <Pill label={`Day ${cycleDay}`} /> : null}
        <IconButton
          name="person-outline"
          onPress={onOpenProfile}
          accessibilityLabel="Open your profile"
        />
      </View>
    </View>
  );
}

/** The human opening: who you are, and a read on where you are. */
function Greeting({ name, phase }: { name?: string; phase: PhaseKey }) {
  const { colors } = useTheme();
  return (
    <View style={styles.greeting}>
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
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // web / unsupported
    }
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
                style={[
                  typography.label,
                  {
                    color: selected ? colors.accentInk : colors.textSecondary,
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

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent, tint } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const today = toLocalDateString();

  const name = useLumaStore((s) => s.profile.displayName);
  const periodLength = useLumaStore((s) => s.profile.usualPeriodLength ?? 1);
  const {
    cycleDay,
    cycleStart,
    prediction,
    dataCoverageText,
    phase,
    phaseLabel,
    cycleMap,
    todayInsight,
    todayLog,
    recommendations,
    baseline,
    fertilitySafety,
    fertilityVisible,
    predictionSafety,
  } = useCycleIntelligence();

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

  return (
    <Screen>
      <PhaseAura phase={phase as PhaseKey} height={isWide ? 420 : 560} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: 148,
            paddingHorizontal: isWide ? spacing.huge : spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Reveal index={0}>
          <Masthead
            name={name}
            cycleDay={cycleDay}
            onOpenProfile={() => router.push('/(tabs)/you')}
          />
        </Reveal>

        <Reveal index={1}>
          <Greeting name={name} phase={phase as PhaseKey} />
        </Reveal>

        <View style={[styles.hero, isWide && styles.heroWide]}>
          <Reveal index={2} style={isWide ? styles.heroLead : undefined}>
            {hasWindow ? (
              <>
                <Eyebrow color={accent}>Next window</Eyebrow>
                <View style={styles.displayRow}>
                  <DisplayText style={styles.displayNumber}>
                    {windowNumber}
                  </DisplayText>
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
                <Eyebrow color={accent}>Building your baseline</Eyebrow>
                <DisplayText
                  style={[
                    styles.displayNumber,
                    { fontSize: 40, lineHeight: 42 },
                  ]}
                >
                  {cycleDay ? `Day ${cycleDay}` : 'Day one'}
                </DisplayText>
                <Body muted style={{ marginTop: spacing.md, maxWidth: 460 }}>
                  {predictionSafety.canShow
                    ? baseline.message
                    : predictionSafety.title}
                </Body>
                {!predictionSafety.canShow ? (
                  <PressableScale
                    onPress={() => router.push('/health-profile')}
                    accessibilityRole="button"
                    accessibilityLabel="Review why period timing is hidden"
                    scaleTo={0.97}
                    style={styles.contextLink}
                  >
                    <DataText color={accent}>Review cycle context</DataText>
                    <AppIcon name="arrow-forward" size={14} color={accent} />
                  </PressableScale>
                ) : null}
                <DataText style={{ marginTop: spacing.md }}>
                  {baseline.cycleCount === 0
                    ? cycleStart
                      ? '1 period start recorded · more starts are needed for a personal range'
                      : 'start with the day your period begins'
                    : `${baseline.cycleCount} completed cycle${
                        baseline.cycleCount === 1 ? '' : 's'
                      } on file`}
                </DataText>
              </>
            )}
          </Reveal>

          <Reveal
            index={3}
            style={isWide ? styles.heroRibbon : styles.ribbonWrap}
          >
            <View
              style={[
                styles.ribbonPanel,
                { borderColor: colors.border, backgroundColor: tint(0.05) },
              ]}
            >
              {/*
                Stacked, not a row: the phase sentence is long enough that a
                row would collide with the eyebrow on a phone.
              */}
              <View style={styles.ribbonHeader}>
                <Eyebrow>Where you are</Eyebrow>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.text, marginTop: 4 },
                  ]}
                >
                  {phaseLabel}
                </Text>
              </View>
              <CycleRibbon
                cycleDay={cycleDay}
                cycleLength={baseline.averageCycleLength ?? 28}
                periodLength={periodLength}
                fertilityEnabled={fertilityVisible}
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

        <Reveal index={4} style={styles.mapWrap}>
          <CycleMapPanel
            cycleMap={cycleMap}
            fertilityEnabled={fertilityVisible}
            fertilitySafety={fertilitySafety}
            onEnableFertility={() => router.push('/health-profile')}
          />
        </Reveal>

        <Reveal index={5}>
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
        </Reveal>

        <Reveal index={6}>
          <SectionRule
            label="How is today?"
            style={styles.sectionSpace}
            right={todayLog ? <Pill label="Logged" icon="checkmark" /> : null}
          />
          <QuickMood date={today} />
          <PressableScale
            onPress={() => router.push('/log')}
            accessibilityRole="button"
            accessibilityLabel={todayLog ? "Edit today's log" : 'Log today'}
            scaleTo={0.985}
            style={[styles.logRow, { borderColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>
                {todayLog ? 'Add more detail' : 'Log flow, energy, symptoms'}
              </Text>
              <Caption style={{ marginTop: 3 }}>
                {todayLog && energy
                  ? `Energy noted as ${energy.label.toLowerCase()}`
                  : 'Skip any day when there is nothing useful to record'}
              </Caption>
            </View>
            <View style={[styles.logGo, { backgroundColor: accent }]}>
              <AppIcon
                name={todayLog ? 'create-outline' : 'add'}
                size={19}
                color={colors.accentInk}
              />
            </View>
          </PressableScale>
        </Reveal>

        <Reveal index={7}>
          <View style={{ marginTop: spacing.mega }}>
            <WhenToSeekHelp compact />
          </View>
        </Reveal>

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

        <Reveal index={8}>
          <View style={[styles.footNote, { borderColor: colors.border }]}>
            <DataText>
              estimates come from your own history — not certainties
            </DataText>
          </View>
        </Reveal>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
  },
  masthead: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMark: {
    width: 34,
    height: 34,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  greeting: {
    marginTop: spacing.xxxl,
  },
  hero: {
    marginTop: spacing.huge,
  },
  contextLink: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.huge,
  },
  heroLead: {
    flex: 1,
  },
  heroRibbon: {
    flex: 1,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  displayNumber: {
    marginTop: spacing.md,
    fontVariant: ['tabular-nums'],
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
  ribbonWrap: {
    marginTop: spacing.xxxl,
  },
  ribbonPanel: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mapWrap: {
    marginTop: spacing.xxxl,
  },
  ribbonHeader: {
    marginBottom: spacing.xl,
  },
  sectionSpace: {
    marginTop: spacing.mega,
    marginBottom: spacing.xl,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickChip: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
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
    marginTop: spacing.giant,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});
