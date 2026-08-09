import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Chip } from '@/components/ui';
import { CONTRACEPTION_OPTIONS } from '@/data/catalog';
import type { ContraceptionType } from '@/types';
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';
import {
  OnboardingContinue,
  OnboardingFrame,
} from '@/components/OnboardingFrame';

export default function ContraceptionScreen() {
  const router = useRouter();
  const patch = useLumaStore((s) => s.patchOnboardingDraft);
  const saved = useLumaStore((s) => s.onboardingDraft.contraceptionType);
  const [value, setValue] = useState<ContraceptionType | undefined>(saved);

  return (
    <OnboardingFrame
      step={5}
      title="Do you use hormonal contraception?"
      description="This helps Luma avoid showing information that may not apply to you."
      onBack={() => router.back()}
      footer={
        <OnboardingContinue
          disabled={!value}
          onPress={() => {
            patch({ contraceptionType: value });
            router.push('/onboarding/context' as never);
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
        {CONTRACEPTION_OPTIONS.map((o) => (
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
