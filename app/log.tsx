import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);

  const symptomOptions = useMemo(() => {
    if (showAllSymptoms) return [...SYMPTOM_LIBRARY];
    const fav = SYMPTOM_LIBRARY.filter((s) => favourites.includes(s.code));
    return fav.length ? fav : SYMPTOM_LIBRARY.slice(0, 8);
  }, [favourites, showAllSymptoms]);

  const toggleSymptom = (code: string) => {
    setSymptoms((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const save = async () => {
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
    router.back();
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl,
          paddingHorizontal: spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Caption>Close</Caption>
        </Pressable>
        <Title style={{ marginTop: spacing.md }}>How are you today?</Title>
        <Caption style={{ marginTop: spacing.sm }}>{date}</Caption>

        <SectionTitle style={{ marginTop: spacing.xxl }}>Mood</SectionTitle>
        <View style={styles.wrap}>
          {MOOD_OPTIONS.map((m) => (
            <Chip
              key={m.value}
              label={m.label}
              emoji={m.emoji}
              selected={mood === m.value}
              onPress={() => setMood(m.value)}
            />
          ))}
        </View>

        <SectionTitle style={{ marginTop: spacing.xl }}>Energy</SectionTitle>
        <View style={styles.wrap}>
          {ENERGY_OPTIONS.map((e) => (
            <Chip
              key={e.value}
              label={e.label}
              selected={energy === e.value}
              onPress={() => setEnergy(e.value)}
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
              onPress={() => setPain(p.value)}
            />
          ))}
        </View>

        <SectionTitle style={{ marginTop: spacing.xl }}>Flow</SectionTitle>
        <View style={styles.wrap}>
          {FLOW_OPTIONS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              selected={flow === f.value}
              onPress={() => setFlow(f.value)}
            />
          ))}
        </View>

        <SectionTitle style={{ marginTop: spacing.xl }}>
          Anything else?
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
        <Pressable onPress={() => setShowAllSymptoms((v) => !v)}>
          <Caption style={{ color: accent, marginBottom: spacing.lg }}>
            {showAllSymptoms ? 'Show favourites only' : 'Show more symptoms'}
          </Caption>
        </Pressable>

        <SectionTitle>Note</SectionTitle>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Anything different today?"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[
            styles.note,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />

        <View style={{ marginTop: spacing.xxl }}>
          <PrimaryButton label="Save" onPress={save} />
        </View>
        <Body muted style={{ marginTop: spacing.md, textAlign: 'center' }}>
          You don&apos;t need to log every day. Record what feels useful.
        </Body>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  note: {
    marginTop: spacing.md,
    minHeight: 100,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    textAlignVertical: 'top',
    ...typography.body,
  },
});
