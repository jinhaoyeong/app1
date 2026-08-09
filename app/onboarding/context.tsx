import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Caption, OptionRow } from '@/components/ui';
import { CYCLE_CONTEXT_OPTIONS } from '@/data/catalog';
import type { CycleContext } from '@/types';
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';
import {
  OnboardingContinue,
  OnboardingFrame,
} from '@/components/OnboardingFrame';

export default function CycleContextScreen() {
  const router = useRouter();
  const patch = useLumaStore((s) => s.patchOnboardingDraft);
  const saved = useLumaStore((s) => s.onboardingDraft.safetyContexts ?? []);
  const [selected, setSelected] = useState<CycleContext[]>(saved);

  const toggle = (value: CycleContext) => {
    setSelected((previous) => {
      if (value === 'none' || value === 'prefer_not_to_say') {
        return previous.includes(value) ? [] : [value];
      }
      return [
        ...previous.filter(
          (item) => item !== 'none' && item !== 'prefer_not_to_say',
        ),
        ...(previous.includes(value) ? [] : [value]),
      ];
    });
  };

  return (
    <OnboardingFrame
      step={6}
      title="Is there anything that changes how your cycle should be read?"
      description="This is not a diagnosis. It helps Luma avoid calendar estimates that may not apply to you. Choose all that fit, or choose none."
      onBack={() => router.back()}
      footer={
        <OnboardingContinue
          disabled={selected.length === 0}
          hint={selected.length ? undefined : 'Choose one option to continue'}
          onPress={() => {
            patch({ safetyContexts: selected, safetyContextReviewed: true });
            router.push('/onboarding/privacy');
          }}
        />
      }
    >
      <View>
        {CYCLE_CONTEXT_OPTIONS.map((option) => (
          <OptionRow
            key={option.value}
            label={option.label}
            multi
            selected={selected.includes(option.value as CycleContext)}
            onPress={() => toggle(option.value as CycleContext)}
          />
        ))}
      </View>
      <Caption style={{ marginTop: spacing.md }}>
        You can review this later in You → Health profile. If you are unsure,
        Luma keeps fertile timing hidden until you have more context.
      </Caption>
    </OnboardingFrame>
  );
}
