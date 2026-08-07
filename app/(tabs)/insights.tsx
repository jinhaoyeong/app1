import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
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
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { patternMeta } from '@/engine/patterns';
import { spacing } from '@/theme/tokens';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { baseline, patterns, changes, comparison } = useCycleIntelligence();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: 148,
          paddingHorizontal: spacing.xxl,
        }}
      >
        <Title>Insights</Title>
        <Body muted style={{ marginTop: spacing.sm }}>
          Plain-language patterns from your own history — not diagnoses.
        </Body>

        <Card style={{ marginTop: spacing.xxl }}>
          <SectionTitle>
            {baseline.cycleLengthRange
              ? `${baseline.cycleLengthRange[0]}–${baseline.cycleLengthRange[1]} days`
              : 'Still learning your cycle'}
          </SectionTitle>
          <Body muted style={{ marginTop: spacing.sm }}>
            {baseline.message}
          </Body>
          {baseline.averageCycleLength ? (
            <Caption style={{ marginTop: spacing.md }}>
              Average {baseline.averageCycleLength} days
              {baseline.cycleVariation !== undefined
                ? ` · typical variation ±${baseline.cycleVariation}`
                : ''}
            </Caption>
          ) : (
            <View style={{ marginTop: spacing.lg }}>
              <PrimaryButton
                label="Log today to build your pattern"
                onPress={() => router.push('/log')}
              />
            </View>
          )}
        </Card>

        <SectionTitle style={{ marginTop: spacing.xxl }}>Patterns</SectionTitle>
        {patterns.length === 0 ? (
          <Card style={{ marginTop: spacing.md }}>
            <Body muted>
              Patterns appear after repeated logs across several cycles. Record
              what feels useful — you don’t need every day.
            </Body>
            <View style={{ marginTop: spacing.lg }}>
              <PrimaryButton
                label="Log today"
                variant="secondary"
                onPress={() => router.push('/log')}
              />
            </View>
          </Card>
        ) : (
          patterns.map((p) => (
            <Card key={p.id} style={{ marginTop: spacing.md }}>
              <SectionTitle>{p.title}</SectionTitle>
              <Caption style={{ marginTop: spacing.sm }}>
                {patternMeta(p)}
              </Caption>
              <Body muted style={{ marginTop: spacing.sm }}>
                {p.body.split('\n\n')[0]}
              </Body>
              <Caption style={{ marginTop: spacing.md }}>
                Why you&apos;re seeing this: based on your own tracking history.
              </Caption>
            </Card>
          ))
        )}

        <SectionTitle style={{ marginTop: spacing.xxl }}>Changes</SectionTitle>
        {changes.length === 0 ? (
          <Card style={{ marginTop: spacing.md }}>
            <Body muted>Nothing unusual detected relative to your recent pattern.</Body>
          </Card>
        ) : (
          changes.map((c) => (
            <Card key={c.id} style={{ marginTop: spacing.md }}>
              <SectionTitle>{c.title}</SectionTitle>
              <Body muted style={{ marginTop: spacing.sm }}>
                {c.body}
              </Body>
            </Card>
          ))
        )}

        <SectionTitle style={{ marginTop: spacing.xxl }}>
          Compare cycles
        </SectionTitle>
        <Card style={{ marginTop: spacing.md }}>
          {comparison.length === 0 ? (
            <Body muted>Not enough cycles yet to compare.</Body>
          ) : (
            comparison.map((row) => (
              <View key={row.startDate} style={{ marginBottom: spacing.md }}>
                <Body>
                  {format(parseISO(row.startDate), 'MMM yyyy')} ·{' '}
                  {row.length ? `${row.length} days` : 'In progress'}
                  {row.periodLength ? ` · ${row.periodLength}d period` : ''}
                </Body>
                <Caption>{row.mainDifference}</Caption>
              </View>
            ))
          )}
        </Card>

        <View style={{ marginTop: spacing.xxl }}>
          <PrimaryButton
            label="Create health summary"
            variant="secondary"
            onPress={() => router.push('/health-summary')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
