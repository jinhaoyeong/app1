import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Chip,
  PrimaryButton,
  Screen,
  Title,
} from '@/components/ui';
import { GOAL_OPTIONS } from '@/data/catalog';
import type { TrackingGoal } from '@/types';
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';
import { OnboardingProgress } from '@/components/OnboardingProgress';

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const patch = useLumaStore((s) => s.patchOnboardingDraft);
  const existing = useLumaStore((s) => s.onboardingDraft.trackingGoals);
  const [selected, setSelected] = useState<TrackingGoal[]>(existing);

  const toggle = (g: TrackingGoal) => {
    setSelected((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  };

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
        <OnboardingProgress step={1} />
        <Title>What would you like help with?</Title>
        <Body muted style={{ marginTop: spacing.sm }}>
          Choose as many as you like. This shapes what Luma emphasises.
        </Body>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: spacing.xxl,
          }}
        >
          {GOAL_OPTIONS.map((g) => (
            <Chip
              key={g.value}
              label={g.label}
              selected={selected.includes(g.value)}
              onPress={() => toggle(g.value)}
            />
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <PrimaryButton
          label="Continue"
          disabled={selected.length === 0}
          onPress={() => {
            patch({ trackingGoals: selected });
            router.push('/onboarding/last-period');
          }}
        />
      </ScrollView>
    </Screen>
  );
}
