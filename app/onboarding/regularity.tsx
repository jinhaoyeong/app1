import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Chip } from '@/components/ui';
import type { CycleRegularity } from '@/types';
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';
import {
  OnboardingContinue,
  OnboardingFrame,
} from '@/components/OnboardingFrame';

const OPTIONS: { value: CycleRegularity; label: string }[] = [
  { value: 'usually', label: 'Usually' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'unsure', label: "I'm not sure" },
];

export default function RegularityScreen() {
  const router = useRouter();
  const patch = useLumaStore((s) => s.patchOnboardingDraft);
  const saved = useLumaStore((s) => s.onboardingDraft.cycleRegularity);
  const [value, setValue] = useState<CycleRegularity | undefined>(saved);

  return (
    <OnboardingFrame
      step={4}
      title="Are your cycles usually regular?"
      description="You do not need to know your exact cycle length."
      onBack={() => router.back()}
      footer={
        <OnboardingContinue
          disabled={!value}
          onPress={() => {
            patch({ cycleRegularity: value });
            router.push('/onboarding/contraception');
          }}
        />
      }
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: spacing.xxl,
        }}
      >
        {OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={value === o.value}
            onPress={() => setValue(o.value)}
          />
        ))}
      </View>
    </OnboardingFrame>
  );
}
