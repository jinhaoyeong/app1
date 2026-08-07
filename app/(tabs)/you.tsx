import React from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { CONTRACEPTION_OPTIONS, GOAL_OPTIONS } from '@/data/catalog';
import { spacing } from '@/theme/tokens';

export default function YouScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useLumaStore((s) => s.profile);
  const appearance = useLumaStore((s) => s.appearance);
  const deleteAllData = useLumaStore((s) => s.deleteAllData);
  const loadDemoData = useLumaStore((s) => s.loadDemoData);

  const contraception = CONTRACEPTION_OPTIONS.find(
    (c) => c.value === profile.contraceptionType,
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: 120,
          paddingHorizontal: spacing.xxl,
        }}
      >
        <Title>You</Title>
        <Body muted style={{ marginTop: spacing.sm }}>
          Your cycle belongs to you.
        </Body>

        <Card style={{ marginTop: spacing.xxl }}>
          <SectionTitle>Goals</SectionTitle>
          <Body muted style={{ marginTop: spacing.sm }}>
            {profile.trackingGoals.length
              ? profile.trackingGoals
                  .map(
                    (g) =>
                      GOAL_OPTIONS.find((o) => o.value === g)?.label ?? g,
                  )
                  .join(' · ')
              : 'No goals selected'}
          </Body>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>Health profile</SectionTitle>
          <Body style={{ marginTop: spacing.sm }}>
            Contraception · {contraception?.label ?? 'Not set'}
          </Body>
          <Body muted style={{ marginTop: spacing.sm }}>
            Usual period · {profile.usualPeriodLength ?? '—'} days
          </Body>
          <Body muted style={{ marginTop: spacing.sm }}>
            Fertility features ·{' '}
            {profile.fertilityEnabled ? 'On' : 'Off'}
          </Body>
        </Card>

        <Card
          style={{ marginTop: spacing.lg }}
          onPress={() => router.push('/appearance')}
        >
          <SectionTitle>Appearance</SectionTitle>
          <Caption style={{ marginTop: spacing.sm }}>
            {appearance.colorMode} · {appearance.accent.replace('_', ' ')}
            {appearance.discreetMode ? ' · discreet mode' : ''}
          </Caption>
        </Card>

        <Card
          style={{ marginTop: spacing.lg }}
          onPress={() => router.push('/notifications')}
        >
          <SectionTitle>Notifications</SectionTitle>
          <Caption style={{ marginTop: spacing.sm }}>
            Configure reminders and discreet lock-screen text
          </Caption>
        </Card>

        <Card
          style={{ marginTop: spacing.lg }}
          onPress={() => router.push('/privacy')}
        >
          <SectionTitle>Privacy</SectionTitle>
          <Caption style={{ marginTop: spacing.sm }}>
            App lock, export, delete · local-first by default
          </Caption>
        </Card>

        <Card
          style={{ marginTop: spacing.lg }}
          onPress={() => router.push('/health-summary')}
        >
          <SectionTitle>Health summary</SectionTitle>
          <Caption style={{ marginTop: spacing.sm }}>
            Prepare a calm summary for a healthcare visit
          </Caption>
        </Card>

        <Card
          style={{ marginTop: spacing.lg }}
          onPress={() => router.push('/preparation')}
        >
          <SectionTitle>Period preparation</SectionTitle>
          <Caption style={{ marginTop: spacing.sm }}>
            Checklist for the days before your period
          </Caption>
        </Card>

        <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
          <PrimaryButton
            label="Load demo history (6 cycles)"
            variant="secondary"
            onPress={() => {
              loadDemoData();
              Alert.alert(
                'Demo data loaded',
                'Explore Today and Insights with a mature personal pattern.',
              );
            }}
          />
          <PrimaryButton
            label="Reset onboarding"
            variant="ghost"
            onPress={() => {
              Alert.alert(
                'Reset?',
                'This clears all local data and returns to onboarding.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                      deleteAllData();
                      router.replace('/onboarding');
                    },
                  },
                ],
              );
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
