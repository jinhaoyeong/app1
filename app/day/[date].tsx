import React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import {
  Body,
  Caption,
  Card,
  PrimaryButton,
  Screen,
  SectionTitle,
  Title,
} from '@/components/ui';
import { useLumaStore } from '@/store/lumaStore';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { cycleDayForDate } from '@/engine/cycle';
import {
  ENERGY_OPTIONS,
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  PAIN_OPTIONS,
  SYMPTOM_LIBRARY,
} from '@/data/catalog';
import { spacing } from '@/theme/tokens';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const log = useLumaStore((s) => (date ? s.dailyLogs[date] : undefined));
  const episodes = useLumaStore((s) => s.periodEpisodes);
  const deleteDailyLog = useLumaStore((s) => s.deleteDailyLog);
  const { prediction } = useCycleIntelligence(date);

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

  const isPredicted =
    prediction &&
    date >= prediction.lowerBound &&
    date <= prediction.upperBound;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xxl,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Caption>Back</Caption>
        </Pressable>
        <Title style={{ marginTop: spacing.md }}>
          {format(parseISO(date), 'MMMM d')}
        </Title>
        <Caption style={{ marginTop: spacing.sm }}>
          {day ? `Cycle Day ${day}` : 'Outside known cycle'}
          {isPredicted ? ' · Predicted period window' : ''}
        </Caption>

        <Card style={{ marginTop: spacing.xxl }}>
          <SectionTitle>Log</SectionTitle>
          {log ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Body>Flow · {flow?.label ?? '—'}</Body>
              <Body>
                Mood · {mood ? `${mood.emoji} ${mood.label}` : '—'}
              </Body>
              <Body>Energy · {energy?.label ?? '—'}</Body>
              <Body>Pain · {pain?.label ?? '—'}</Body>
              <Body muted>
                Symptoms ·{' '}
                {log.symptoms?.length
                  ? log.symptoms
                      .map(
                        (c) =>
                          SYMPTOM_LIBRARY.find((s) => s.code === c)?.label ??
                          c,
                      )
                      .join(', ')
                  : 'None'}
              </Body>
              {log.note ? (
                <Body style={{ marginTop: spacing.md }}>{log.note}</Body>
              ) : null}
            </View>
          ) : (
            <Body muted style={{ marginTop: spacing.md }}>
              Nothing logged for this day.
            </Body>
          )}
        </Card>

        <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
          <PrimaryButton
            label={log ? 'Edit log' : 'Add log'}
            onPress={() => router.push('/log')}
          />
          {log ? (
            <PrimaryButton
              label="Delete log"
              variant="ghost"
              onPress={() => {
                Alert.alert('Delete this log?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      deleteDailyLog(date);
                      router.back();
                    },
                  },
                ]);
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
