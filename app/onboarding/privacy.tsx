import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Card,
  PrimaryButton,
  Screen,
  SectionTitle,
  Title,
} from '@/components/ui';
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';
import { OnboardingProgress } from '@/components/OnboardingProgress';

export default function PrivacyOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const completeOnboarding = useLumaStore((s) => s.completeOnboarding);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xxl,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xxl,
          flexGrow: 1,
        }}
      >
        <OnboardingProgress step={6} />
        <Title>Your cycle belongs to you.</Title>
        <Body muted style={{ marginTop: spacing.sm }}>
          Privacy is part of the product — not fine print.
        </Body>

        <Card style={{ marginTop: spacing.xxl }}>
          <SectionTitle>Private by design</SectionTitle>
          <Body muted style={{ marginTop: spacing.sm }}>
            Your health information stays on this device in the MVP. Sync is
            never automatic.
          </Body>
        </Card>
        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>No reproductive advertising</SectionTitle>
          <Body muted style={{ marginTop: spacing.sm }}>
            Your reproductive data is never used for targeted advertising.
          </Body>
        </Card>
        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>You stay in control</SectionTitle>
          <Body muted style={{ marginTop: spacing.sm }}>
            Export or delete everything from Settings → Privacy. No support email
            required.
          </Body>
        </Card>

        <View style={{ flex: 1, minHeight: spacing.xxl }} />
        <PrimaryButton
          label="Start tracking"
          onPress={() => {
            completeOnboarding();
            router.replace('/(tabs)/today');
          }}
        />
      </ScrollView>
    </Screen>
  );
}
