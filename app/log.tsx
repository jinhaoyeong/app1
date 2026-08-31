import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import {
  AppIcon,
  Caption,
  Chip,
  DataText,
  Eyebrow,
  IconButton,
  PrimaryButton,
  Screen,
  SectionRule,
} from '@/components/ui';
import { PressableScale, Reveal } from '@/components/motion';
import { useLumaStore } from '@/store/lumaStore';
import {
  ENERGY_OPTIONS,
  BLEEDING_TYPE_OPTIONS,
  FLOW_OPTIONS,
  FUNCTIONAL_IMPACT_OPTIONS,
  SEXUAL_ACTIVITY_OPTIONS,
  MOOD_OPTIONS,
  PAIN_OPTIONS,
  SYMPTOM_LIBRARY,
} from '@/data/catalog';
import type {
  BleedingType,
  EnergyLevel,
  FlowLevel,
  FunctionalImpact,
  MoodLevel,
  PainLevel,
  SexualActivityType,
} from '@/types';
import { toLocalDateString } from '@/utils/dates';
import { playNotificationHaptic, playSelectionHaptic } from '@/utils/haptics';
import { noticeAsync } from '@/ui/dialogs';
import { useTheme } from '@/theme/ThemeProvider';
import { screenTopInset, stackBottomInset } from '@/navigation/tabRoute';
import { radii, spacing, typography, withAlpha } from '@/theme/tokens';

const FLOW_QUICK = FLOW_OPTIONS;
const ENERGY_QUICK = ENERGY_OPTIONS.filter((e) =>
  ['low', 'normal', 'high'].includes(e.value),
);

/** Intensity levels used by the flow selector — shape, not colour alone. */
const FLOW_INTENSITY: Record<string, number> = {
  none: 0,
  spotting: 1,
  light: 2,
  medium: 3,
  heavy: 4,
  very_heavy: 5,
};

/**
 * Flow reads as a scale, not a list: each option shows how much it means with
 * five steps, so the choice is legible before the label is read.
 */
function FlowSelector({
  value,
  onChange,
  compact,
}: {
  value?: FlowLevel;
  onChange: (next?: FlowLevel) => void;
  compact: boolean;
}) {
  const { colors } = useTheme();
  const tileWidth = compact ? 70 : 78;
  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      directionalLockEnabled
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Bleeding amount"
      accessibilityHint="Swipe sideways for more options"
      style={styles.flowScroll}
      contentContainerStyle={[styles.flowRow, compact && { gap: 6 }]}
    >
      {FLOW_QUICK.map((f) => {
        const selected = value === f.value;
        const level = FLOW_INTENSITY[f.value] ?? 0;
        return (
          <PressableScale
            key={f.value}
            onPress={() => onChange(selected ? undefined : f.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Flow: ${f.label}`}
            scaleTo={0.93}
            style={[
              styles.flowTile,
              { width: tileWidth },
              compact && { paddingHorizontal: 2 },
              {
                backgroundColor: selected
                  ? withAlpha(colors.period, 0.16)
                  : colors.surface,
                borderColor: selected ? colors.period : colors.border,
              },
            ]}
          >
            <View style={styles.flowSteps}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.flowStep,
                    {
                      height: 5 + i * 3,
                      backgroundColor:
                        i < level
                          ? colors.period
                          : selected
                            ? withAlpha(colors.period, 0.28)
                            : colors.surfaceMuted,
                    },
                  ]}
                />
              ))}
            </View>
            <Text
              numberOfLines={2}
              style={[
                typography.caption,
                {
                  // "Spotting" must not break mid-word on a 320pt screen.
                  fontSize: compact ? 10.5 : 12,
                  textAlign: 'center',
                  marginTop: spacing.md,
                  fontWeight: selected ? '700' : '500',
                  color: selected ? colors.text : colors.textSecondary,
                },
              ]}
            >
              {f.label}
            </Text>
            {selected ? (
              <View
                style={[styles.flowCheck, { backgroundColor: colors.period }]}
              >
                <AppIcon name="checkmark" size={10} color={colors.periodInk} />
              </View>
            ) : null}
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent, tint } = useTheme();
  const { width } = useWindowDimensions();
  // The wrapped flow grid on a 320pt screen needs the tighter gutter.
  const compact = width < 360;
  const gutter = compact ? spacing.lg : spacing.xxl;
  const { date: requestedDate } = useLocalSearchParams<{ date?: string }>();
  const date = requestedDate ?? toLocalDateString();
  const isToday = date === toLocalDateString();
  const dateLabel = format(parseISO(date), 'MMMM d');
  const existing = useLumaStore((s) => s.dailyLogs[date]);
  const favourites = useLumaStore((s) => s.favouriteSymptoms);
  const upsertDailyLog = useLumaStore((s) => s.upsertDailyLog);

  const [mood, setMood] = useState<MoodLevel | undefined>(existing?.mood);
  const [energy, setEnergy] = useState<EnergyLevel | undefined>(
    existing?.energy,
  );
  const [pain, setPain] = useState<PainLevel | undefined>(existing?.pain);
  const [flow, setFlow] = useState<FlowLevel | undefined>(existing?.flow);
  const [bleedingType, setBleedingType] = useState<BleedingType | undefined>(
    existing?.bleedingType,
  );
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [sexualActivity, setSexualActivity] = useState<
    SexualActivityType | undefined
  >(existing?.sexualActivity);
  const [functionalImpact, setFunctionalImpact] = useState<
    FunctionalImpact | undefined
  >(existing?.functionalImpact);
  const [note, setNote] = useState(existing?.note ?? '');
  const [showMore, setShowMore] = useState(
    !!(
      existing?.energy ||
      existing?.pain ||
      existing?.symptoms?.length ||
      existing?.sexualActivity ||
      existing?.note
    ),
  );
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);

  const symptomOptions = useMemo(() => {
    if (showAllSymptoms) return [...SYMPTOM_LIBRARY];
    const fav = SYMPTOM_LIBRARY.filter((s) => favourites.includes(s.code));
    return (fav.length ? fav : SYMPTOM_LIBRARY.slice(0, 6)).slice(0, 6);
  }, [favourites, showAllSymptoms]);

  const toggleSymptom = async (code: string) => {
    setSymptoms((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
    playSelectionHaptic();
  };

  // Functional impact is only asked when there is pain worth qualifying.
  const asksImpact = pain === 'moderate' || pain === 'severe';

  const filledCount = [
    flow,
    mood,
    energy,
    pain,
    symptoms.length ? 'y' : undefined,
    sexualActivity,
    note.trim() || undefined,
  ].filter(Boolean).length;
  const hasContent = filledCount > 0;
  const bottom = stackBottomInset(insets.bottom, Platform.OS === 'web');

  const save = async () => {
    if (!hasContent) {
      await noticeAsync({
        title: 'Nothing to save',
        message:
          'Choose flow, mood, or another detail, or close without saving.',
      });
      return;
    }
    if (flow && flow !== 'none' && !bleedingType) {
      await noticeAsync({
        title: 'Choose the bleeding context',
        message:
          'Tell Luma whether this was a menstrual period, spotting, withdrawal bleeding, breakthrough bleeding, bleeding after sex, or whether you are unsure. This prevents an uncertain bleed from changing your cycle dates.',
      });
      return;
    }
    const saved = await upsertDailyLog(date, {
      mood,
      energy,
      pain,
      flow,
      bleedingType,
      symptoms,
      sexualActivity,
      // Impact only means something next to pain that was actually recorded.
      functionalImpact: asksImpact ? functionalImpact : undefined,
      note: note.trim() || undefined,
      painLocations: symptoms.includes('cramps') ? ['cramps'] : undefined,
    });
    if (!saved) {
      await noticeAsync({
        title: 'Not saved',
        message: 'Not saved — internet required. Your log is still unchanged.',
      });
      return;
    }
    playNotificationHaptic('success');
    // Await the notice, then close. Previously `router.back()` lived inside an
    // Alert button, so on web the sheet never closed after saving.
    await noticeAsync({
      title: 'Saved',
      message: `Your log for ${dateLabel} is updated.`,
    });
    router.back();
  };

  return (
    <Screen>
      {/* Keeps Save reachable while the note field has the keyboard open. */}
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.sheetHead,
            {
              paddingTop: screenTopInset(
                insets.top,
                Platform.OS === 'web',
                spacing.md,
              ),
              paddingHorizontal: gutter,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.sheetHeadInner}>
            <View style={{ flex: 1 }}>
              <Eyebrow color={accent}>
                {isToday ? 'Today' : format(parseISO(date), 'EEEE')}
              </Eyebrow>
              <Text
                style={[typography.title, { color: colors.text, marginTop: 2 }]}
              >
                {dateLabel}
              </Text>
            </View>
            <IconButton
              name="close"
              onPress={() => router.back()}
              accessibilityLabel="Close without saving"
            />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: spacing.xxl, paddingHorizontal: gutter },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <Reveal index={0}>
            <SectionRule
              label="Bleeding"
              style={styles.firstRule}
              right={<DataText>optional</DataText>}
            />
            <FlowSelector
              value={flow}
              onChange={(next) => {
                setFlow(next);
                if (!next || next === 'none') setBleedingType(undefined);
                if (next === 'spotting') setBleedingType('spotting');
                if (
                  next &&
                  next !== 'none' &&
                  next !== 'spotting' &&
                  bleedingType === 'spotting'
                ) {
                  setBleedingType(undefined);
                }
              }}
              compact={compact}
            />
            {flow && flow !== 'none' ? (
              <View style={styles.bleedingTypeBlock}>
                <Caption style={{ marginBottom: spacing.sm }}>
                  What kind of bleeding was this? This keeps spotting or
                  breakthrough bleeding from being counted as a new period.
                </Caption>
                <View style={styles.wrap}>
                  {BLEEDING_TYPE_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      selected={bleedingType === option.value}
                      onPress={() =>
                        setBleedingType((current) =>
                          current === option.value
                            ? undefined
                            : (option.value as BleedingType),
                        )
                      }
                    />
                  ))}
                </View>
                {flow === 'very_heavy' ? (
                  <Caption style={{ marginTop: spacing.md }}>
                    “Very heavy” is a personal description, not a blood-loss
                    measurement. If you are soaking a pad or tampon about every
                    hour for more than 2 hours and also feel dizzy or
                    lightheaded, short of breath, or have chest pain, seek
                    emergency medical care now.
                  </Caption>
                ) : null}
              </View>
            ) : null}
          </Reveal>

          <Reveal index={1}>
            <SectionRule label="Mood" style={styles.rule} />
            <View style={styles.wrap}>
              {MOOD_OPTIONS.map((m) => (
                <Chip
                  key={m.value}
                  label={m.label}
                  selected={mood === m.value}
                  onPress={() =>
                    setMood((prev) => (prev === m.value ? undefined : m.value))
                  }
                />
              ))}
            </View>
          </Reveal>

          {!showMore ? (
            <Reveal index={2}>
              <PressableScale
                onPress={() => setShowMore(true)}
                accessibilityRole="button"
                accessibilityLabel="Add more detail"
                scaleTo={0.98}
                style={[
                  styles.expand,
                  { borderColor: tint(0.35), backgroundColor: tint(0.07) },
                ]}
              >
                <AppIcon name="add-circle-outline" size={18} color={accent} />
                <Text style={[typography.bodyMedium, { color: accent }]}>
                  Add energy, pain, symptoms, note
                </Text>
              </PressableScale>
            </Reveal>
          ) : (
            <>
              <Reveal index={2}>
                <SectionRule label="Energy" style={styles.rule} />
                <View style={styles.wrap}>
                  {ENERGY_QUICK.map((e) => (
                    <Chip
                      key={e.value}
                      label={e.label}
                      selected={energy === e.value}
                      onPress={() =>
                        setEnergy((prev) =>
                          prev === e.value ? undefined : e.value,
                        )
                      }
                    />
                  ))}
                </View>
              </Reveal>

              <Reveal index={3}>
                <SectionRule label="Pain" style={styles.rule} />
                <View style={styles.wrap}>
                  {PAIN_OPTIONS.map((p) => (
                    <Chip
                      key={p.value}
                      label={p.label}
                      selected={pain === p.value}
                      onPress={() =>
                        setPain((prev) =>
                          prev === p.value ? undefined : p.value,
                        )
                      }
                    />
                  ))}
                </View>
                {asksImpact ? (
                  <View style={styles.subQuestion}>
                    <Caption>
                      Did this stop you doing your usual activities?
                    </Caption>
                    <View style={[styles.wrap, styles.subQuestionRow]}>
                      {FUNCTIONAL_IMPACT_OPTIONS.map((option) => (
                        <Chip
                          key={option.value}
                          label={option.label}
                          selected={functionalImpact === option.value}
                          onPress={() =>
                            setFunctionalImpact((prev) =>
                              prev === option.value ? undefined : option.value,
                            )
                          }
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </Reveal>

              <Reveal index={4}>
                <SectionRule
                  label="Symptoms"
                  style={styles.rule}
                  right={
                    symptoms.length ? (
                      <DataText
                        color={accent}
                      >{`${symptoms.length} on`}</DataText>
                    ) : null
                  }
                />
                <View style={styles.wrap}>
                  {symptomOptions.map((s) => (
                    <Chip
                      key={s.code}
                      label={s.label}
                      selected={symptoms.includes(s.code)}
                      onPress={() => toggleSymptom(s.code)}
                    />
                  ))}
                </View>
                <PressableScale
                  onPress={() => setShowAllSymptoms((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showAllSymptoms
                      ? 'Show fewer symptoms'
                      : 'Show all symptoms'
                  }
                  scaleTo={0.96}
                  style={styles.moreButton}
                >
                  <Text style={[typography.label, { color: accent }]}>
                    {showAllSymptoms ? 'Show fewer' : 'Show the full library'}
                  </Text>
                  <AppIcon
                    name={showAllSymptoms ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color={accent}
                  />
                </PressableScale>
              </Reveal>

              <Reveal index={5}>
                <SectionRule label="Intimacy" style={styles.rule} />
                <View style={styles.wrap}>
                  {SEXUAL_ACTIVITY_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      selected={sexualActivity === option.value}
                      onPress={() =>
                        setSexualActivity((prev) =>
                          prev === option.value ? undefined : option.value,
                        )
                      }
                    />
                  ))}
                </View>
                <Caption style={styles.sectionNote}>
                  Optional, and private to your account. Leaving this blank
                  always means nothing was recorded — never that nothing
                  happened.
                </Caption>
              </Reveal>

              <Reveal index={6}>
                <SectionRule label="Note" style={styles.rule} />
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Anything different today?"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  accessibilityLabel="Daily note"
                  style={[
                    styles.note,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
              </Reveal>
            </>
          )}

          <Caption style={{ marginTop: spacing.xxl, textAlign: 'center' }}>
            Log only what is useful to you. Blank days are fine.
          </Caption>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: bottom + spacing.lg,
              paddingHorizontal: gutter,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View style={styles.footerInner}>
            <View style={styles.footerMeta}>
              <DataText>
                {filledCount === 0
                  ? 'nothing selected yet'
                  : `${filledCount} detail${filledCount === 1 ? '' : 's'} ready`}
              </DataText>
            </View>
            <PrimaryButton
              label="Save log"
              onPress={save}
              disabled={!hasContent}
              icon="checkmark"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  sheetHead: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetHeadInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  bleedingTypeBlock: {
    marginTop: spacing.xl,
  },
  firstRule: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  subQuestion: {
    marginTop: spacing.md,
  },
  subQuestionRow: {
    marginTop: spacing.sm,
  },
  sectionNote: {
    marginTop: spacing.sm,
  },
  rule: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg,
  },
  flowScroll: {
    flexGrow: 0,
    minHeight: 96,
    marginHorizontal: -2,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    paddingRight: spacing.lg,
    paddingVertical: 2,
  },
  flowTile: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 92,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
  },
  flowSteps: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 14,
  },
  flowStep: {
    width: 4,
    borderRadius: radii.full,
  },
  flowCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  expand: {
    marginTop: spacing.xxxl,
    minHeight: 56,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  moreButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
  },
  note: {
    minHeight: 96,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    textAlignVertical: 'top',
    ...typography.body,
  },
  // In normal flow, not absolute, so KeyboardAvoidingView can lift it.
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  footerMeta: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
});
