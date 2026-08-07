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
import type { CycleRegularity } from '@/types';
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';

const OPTIONS: { value: CycleRegularity; label: string }[] = [
  { value: 'usually', label: 'Usually' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'unsure', label: "I'm not sure" },
];

export default function RegularityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const patch = useLumaStore((s) => s.patchOnboardingDraft);
  const [value, setValue] = useState<CycleRegularity | undefined>();

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
        <Title>Are your cycles usually regular?</Title>
        <Body muted style={{ marginTop: spacing.sm }}>
          You don&apos;t need to know your exact cycle length.
        </Body>
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
        <View style={{ flex: 1 }} />
        <PrimaryButton
          label="Continue"
          disabled={!value}
          onPress={() => {
            patch({ cycleRegularity: value });
            router.push('/onboarding/contraception');
          }}
        />
      </ScrollView>
    </Screen>
  );
}
