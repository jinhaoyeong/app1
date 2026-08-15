import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Caption, Chip } from '@/components/ui';
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';
import {
  OnboardingContinue,
  OnboardingFrame,
} from '@/components/OnboardingFrame';
import { MENSTRUAL_REFERENCE } from '@/health/menstrualHealth';

const LENGTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function PeriodLengthScreen() {
  const router = useRouter();
  const patch = useLumaStore((s) => s.patchOnboardingDraft);
  const saved = useLumaStore((s) => s.onboardingDraft.usualPeriodLength);
  // Resume where setup left off rather than snapping back to the default.
  const [length, setLength] = useState<number | undefined>(saved);

  return (
    <OnboardingFrame
      step={3}
      title="How long does your period usually last?"
      description="Count from the first day of menstrual bleeding through the last day of bleeding. Do not include spotting before the period. Choose “I'm not sure” instead of guessing."
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
            label={`${n} ${n === 1 ? 'day' : 'days'}`}
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
      {length !== undefined &&
      length > MENSTRUAL_REFERENCE.periodDaysUpperReviewPoint ? (
        <Caption style={{ marginTop: spacing.md }}>
          Bleeding longer than 7 days is worth discussing with a clinician. Keep
          the truthful duration selected here.
        </Caption>
      ) : null}
    </OnboardingFrame>
  );
}
