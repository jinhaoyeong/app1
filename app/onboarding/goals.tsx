import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Caption, OptionRow } from '@/components/ui';
import { GOAL_OPTIONS } from '@/data/catalog';
import type { TrackingGoal } from '@/types';
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';
import {
  OnboardingContinue,
  OnboardingFrame,
} from '@/components/OnboardingFrame';

export default function GoalsScreen() {
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
    <OnboardingFrame
      step={1}
      title="What would you like help with?"
      description="Choose as many as you like. This shapes what Luma emphasises."
      onBack={() => router.back()}
      footer={
        <OnboardingContinue
          disabled={selected.length === 0}
          hint={
            selected.length
              ? `${selected.length} selected`
              : 'Pick at least one to continue'
          }
          onPress={() => {
            patch({ trackingGoals: selected });
            router.push('/onboarding/last-period');
          }}
        />
      }
    >
      <View>
        {GOAL_OPTIONS.map((g) => (
          <OptionRow
            key={g.value}
            label={g.label}
            multi
            selected={selected.includes(g.value)}
            onPress={() => toggle(g.value)}
          />
        ))}
      </View>
      <Caption style={{ marginTop: spacing.md }}>
        You can change these later in You → Health profile.
      </Caption>
    </OnboardingFrame>
  );
}
