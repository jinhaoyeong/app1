import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import {
  Body,
  BackButton,
  Caption,
  DataText,
  Divider,
  Eyebrow,
  HeroText,
  Pill,
  PrimaryButton,
  Screen,
  SectionRule,
} from '@/components/ui';
import { Reveal } from '@/components/motion';
import { useLumaStore } from '@/store/lumaStore';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { cycleDayForDate } from '@/engine/cycle';
import { confirmAsync } from '@/ui/dialogs';
import {
  ENERGY_OPTIONS,
  BLEEDING_TYPE_OPTIONS,
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  PAIN_OPTIONS,
  SYMPTOM_LIBRARY,
} from '@/data/catalog';
import { spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

function Field({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const empty = value === 'Not logged' || value === 'None';
  return (
    <View style={styles.field}>
      <Eyebrow>{label}</Eyebrow>
      <Text
        style={[
          typography.bodyMedium,
          {
            color: empty ? colors.textTertiary : colors.text,
            marginTop: 4,
            fontWeight: empty ? '400' : '700',
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const log = useLumaStore((s) => (date ? s.dailyLogs[date] : undefined));
  const episodes = useLumaStore((s) => s.periodEpisodes);
  const deleteDailyLog = useLumaStore((s) => s.deleteDailyLog);
  const { colors, accent } = useTheme();
  const { prediction, cycleMap, fertilityVisible } = useCycleIntelligence(date);

  if (!date) {
    return (
      <Screen>
        <Body>Missing date</Body>
      </Screen>
    );
  }

  const day = cycleDayForDate(date, episodes);
  const mood = MOOD_OPTIONS.find((m) => m.value === log?.mood);
  const energy = ENERGY_OPTIONS.find((e) => e.value === log?.energy);
  const pain = PAIN_OPTIONS.find((p) => p.value === log?.pain);
  const flow = FLOW_OPTIONS.find((f) => f.value === log?.flow);
  const bleedingType = BLEEDING_TYPE_OPTIONS.find(
    (option) => option.value === log?.bleedingType,
  );

  const isPredicted =
    prediction &&
    date >= prediction.lowerBound &&
    date <= prediction.upperBound;
  const detailedPhase = fertilityVisible
    ? cycleMap?.phaseForDate(date)
    : undefined;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.mega,
            paddingHorizontal: spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Reveal index={0}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.heading}>
            <Eyebrow color={accent}>{format(parseISO(date), 'EEEE')}</Eyebrow>
            <HeroText style={{ marginTop: spacing.sm }}>
              {format(parseISO(date), 'MMMM d')}
            </HeroText>
            <View style={styles.badges}>
              <Pill label={day ? `Cycle day ${day}` : 'Outside known cycle'} />
              {isPredicted ? (
                <Pill
                  label="Estimated window"
                  color={colors.predicted}
                  icon="ellipse-outline"
                />
              ) : null}
              {fertilityVisible && detailedPhase === 'possible_fertile' ? (
                <Pill
                  label="Possible fertile days"
                  color={colors.fertile}
                  icon="leaf-outline"
                />
              ) : null}
              {fertilityVisible && detailedPhase === 'possible_ovulation' ? (
                <Pill
                  label="Estimated ovulation timing"
                  color={colors.fertile}
                  icon="sparkles-outline"
                />
              ) : null}
              {fertilityVisible &&
              detailedPhase === 'possible_post_ovulation' ? (
                <Pill
                  label="Possible post-ovulation timing"
                  color={accent}
                  icon="arrow-forward-outline"
                />
              ) : null}
            </View>
          </View>
        </Reveal>

        <Reveal index={1}>
          <SectionRule
            label="What you recorded"
            style={styles.sectionSpace}
            right={
              log ? (
                <DataText>{format(parseISO(log.date), 'yyyy-MM-dd')}</DataText>
              ) : null
            }
          />
          {log ? (
            <View style={styles.fieldGrid}>
              <Field label="Flow" value={flow?.label ?? 'Not logged'} />
              <Field
                label="Bleeding context"
                value={
                  bleedingType?.label ?? (flow ? 'Not specified' : 'Not logged')
                }
              />
              <Field label="Mood" value={mood?.label ?? 'Not logged'} />
              <Field label="Energy" value={energy?.label ?? 'Not logged'} />
              <Field label="Pain" value={pain?.label ?? 'Not logged'} />
            </View>
          ) : (
            <Body muted>Nothing logged for this day.</Body>
          )}

          {log ? (
            <>
              <Divider style={{ marginVertical: spacing.xl }} />
              <Eyebrow>Symptoms</Eyebrow>
              <Body
                muted={!log.symptoms?.length}
                style={{ marginTop: spacing.sm }}
              >
                {log.symptoms?.length
                  ? log.symptoms
                      .map(
                        (c) =>
                          SYMPTOM_LIBRARY.find((s) => s.code === c)?.label ?? c,
                      )
                      .join(', ')
                  : 'None recorded'}
              </Body>
              {log.note ? (
                <View style={[styles.note, { borderLeftColor: accent }]}>
                  <Eyebrow>Note</Eyebrow>
                  <Body style={{ marginTop: 4 }}>{log.note}</Body>
                </View>
              ) : null}
            </>
          ) : null}
        </Reveal>

        <Reveal index={2}>
          <View style={{ marginTop: spacing.mega, gap: spacing.md }}>
            <PrimaryButton
              label={log ? 'Edit this log' : 'Add a log'}
              onPress={() => router.push(`/log?date=${date}` as never)}
              icon={log ? 'create-outline' : 'add'}
            />
            {log ? (
              <PrimaryButton
                label="Delete log"
                variant="danger"
                onPress={async () => {
                  const ok = await confirmAsync({
                    title: 'Delete this log?',
                    message:
                      'This removes everything you recorded for this day.',
                    confirmLabel: 'Delete',
                    destructive: true,
                  });
                  if (!ok) return;
                  const deleted = await deleteDailyLog(date);
                  if (deleted) router.back();
                }}
                icon="trash-outline"
              />
            ) : null}
          </View>
          <Caption style={{ marginTop: spacing.xl, textAlign: 'center' }}>
            You can edit or remove any day at any time.
          </Caption>
        </Reveal>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  heading: {
    marginTop: spacing.xxxl,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionSpace: {
    marginTop: spacing.mega,
    marginBottom: spacing.lg,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xl,
  },
  field: {
    width: '50%',
    paddingRight: spacing.md,
  },
  note: {
    marginTop: spacing.xl,
    paddingLeft: spacing.lg,
    borderLeftWidth: 3,
  },
});
