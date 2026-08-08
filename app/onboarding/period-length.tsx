import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Chip } from '@/components/ui';
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';
import {
  OnboardingContinue,
  OnboardingFrame,
} from '@/components/OnboardingFrame';

const LENGTHS = [3, 4, 5, 6, 7];

export default function PeriodLengthScreen() {
  const router = useRouter();
  const patch = useLumaStore((s) => s.patchOnboardingDraft);
  const saved = useLumaStore((s) => s.onboardingDraft.usualPeriodLength);
  // Resume where setup left off rather than snapping back to the default.
  const [length, setLength] = useState<number | undefined>(saved ?? 5);

  return (
    <OnboardingFrame
      step={3}
      title="How long does your period usually last?"
      description="Optional. This helps early predictions."
      onBack={() => router.back()}
      footer={
        <OnboardingContinue
          onPress={() => {
            patch({ usualPeriodLength: length });
            router.push('/onboarding/regularity');
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
        {LENGTHS.map((n) => (
          <Chip
            key={n}
            label={`${n} days`}
            selected={length === n}
            onPress={() => setLength(n)}
          />
        ))}
        <Chip
          label="I'm not sure"
          selected={length === undefined}
          onPress={() => setLength(undefined)}
        />
      </View>
    </OnboardingFrame>
  );
}
