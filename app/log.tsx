import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Body,
  Caption,
  Chip,
  PrimaryButton,
  Screen,
  SectionTitle,
  Title,
} from '@/components/ui';
import { useLumaStore } from '@/store/lumaStore';
import {
  ENERGY_OPTIONS,
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  PAIN_OPTIONS,
  SYMPTOM_LIBRARY,
} from '@/data/catalog';
import type {
  EnergyLevel,
  FlowLevel,
  MoodLevel,
  PainLevel,
} from '@/types';
import { toLocalDateString } from '@/utils/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing, typography } from '@/theme/tokens';

const FLOW_QUICK = FLOW_OPTIONS.filter((f) =>
  ['none', 'spotting', 'light', 'medium', 'heavy'].includes(f.value),
);
const ENERGY_QUICK = ENERGY_OPTIONS.filter((e) =>
  ['low', 'normal', 'high'].includes(e.value),
);

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent } = useTheme();
  const date = toLocalDateString();
  const existing = useLumaStore((s) => s.dailyLogs[date]);
  const favourites = useLumaStore((s) => s.favouriteSymptoms);
  const upsertDailyLog = useLumaStore((s) => s.upsertDailyLog);

  const [mood, setMood] = useState<MoodLevel | undefined>(existing?.mood);
  const [energy, setEnergy] = useState<EnergyLevel | undefined>(
    existing?.energy,
  );
  const [pain, setPain] = useState<PainLevel | undefined>(existing?.pain);
  const [flow, setFlow] = useState<FlowLevel | undefined>(existing?.flow);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [note, setNote] = useState(existing?.note ?? '');
  const [showMore, setShowMore] = useState(
    !!(existing?.energy || existing?.pain || existing?.symptoms?.length || existing?.note),
  );
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);

  const symptomOptions = useMemo(() => {
    if (showAllSymptoms) return [...SYMPTOM_LIBRARY];
    const fav = SYMPTOM_LIBRARY.filter((s) => favourites.includes(s.code));
    return (fav.length ? fav : SYMPTOM_LIBRARY.slice(0, 6)).slice(0, 6);
  }, [favourites, showAllSymptoms]);

  const toggleSymptom = (code: string) => {
    setSymptoms((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const hasContent =
    !!mood ||
    !!energy ||
    !!pain ||
    !!flow ||
    symptoms.length > 0 ||
    note.trim().length > 0;

  const save = async () => {
    if (!hasContent) {
      Alert.alert(
        'Nothing to save',
        'Choose flow, mood, or another detail — or close without saving.',
      );
      return;
    }
    upsertDailyLog(date, {
      mood,
      energy,
      pain,
      flow,
      symptoms,
      note: note.trim() || undefined,
      painLocations: symptoms.includes('cramps') ? ['cramps'] : undefined,
    });
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // web / unsupported
    }
    Alert.alert('Saved', 'Your log for today is updated.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Done', onPress: () => router.back() },
    ]);
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing.lg,
            paddingBottom: 140,
            paddingHorizontal: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close without saving"
            hitSlop={12}
            style={styles.closeHit}
          >
            <Caption>Close</Caption>
          </Pressable>

          <Title style={{ marginTop: spacing.md }}>How are you today?</Title>
          <Caption style={{ marginTop: spacing.sm }}>{date}</Caption>

          <SectionTitle style={{ marginTop: spacing.xxl }}>
            Period flow
          </SectionTitle>
          <Caption style={{ marginTop: spacing.xs }}>
            Start here if you&apos;re bleeding today.
          </Caption>
          <View style={styles.wrap}>
            {FLOW_QUICK.map((f) => (
              <Chip
                key={f.value}
                label={f.label}
                selected={flow === f.value}
                onPress={() =>
                  setFlow((prev) => (prev === f.value ? undefined : f.value))
                }
              />
            ))}
          </View>

          <SectionTitle style={{ marginTop: spacing.xl }}>Mood</SectionTitle>
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

          {!showMore ? (
            <Pressable
              onPress={() => setShowMore(true)}
              accessibilityRole="button"
              style={{ marginTop: spacing.xl, minHeight: 44, justifyContent: 'center' }}
            >
              <Caption style={{ color: accent }}>
                Add energy, pain, symptoms, or a note
              </Caption>
            </Pressable>
          ) : (
            <>
              <SectionTitle style={{ marginTop: spacing.xl }}>
                Energy
              </SectionTitle>
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

              <SectionTitle style={{ marginTop: spacing.xl }}>Pain</SectionTitle>
              <View style={styles.wrap}>
                {PAIN_OPTIONS.map((p) => (
                  <Chip
                    key={p.value}
                    label={p.label}
                    selected={pain === p.value}
                    onPress={() =>
                      setPain((prev) => (prev === p.value ? undefined : p.value))
                    }
                  />
                ))}
              </View>

              <SectionTitle style={{ marginTop: spacing.xl }}>
                Symptoms
              </SectionTitle>
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
              <Pressable
                onPress={() => setShowAllSymptoms((v) => !v)}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Caption style={{ color: accent }}>
                  {showAllSymptoms ? 'Show fewer' : 'Show more symptoms'}
                </Caption>
              </Pressable>

              <SectionTitle style={{ marginTop: spacing.lg }}>Note</SectionTitle>
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
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + spacing.lg,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <PrimaryButton
            label="Save"
            onPress={save}
            disabled={!hasContent}
          />
          <Body muted style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            Record what feels useful.
          </Body>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeHit: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  note: {
    marginTop: spacing.md,
    minHeight: 88,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    textAlignVertical: 'top',
    ...typography.body,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
