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
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';
import { OnboardingProgress } from '@/components/OnboardingProgress';

const LENGTHS = [3, 4, 5, 6, 7];

export default function PeriodLengthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const patch = useLumaStore((s) => s.patchOnboardingDraft);
  const [length, setLength] = useState<number | undefined>(5);

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
        <OnboardingProgress step={3} />
        <Title>How long does your period usually last?</Title>
        <Body muted style={{ marginTop: spacing.sm }}>
          Optional — helps early predictions.
        </Body>
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
        <View style={{ flex: 1 }} />
        <PrimaryButton
          label="Continue"
          onPress={() => {
            patch({ usualPeriodLength: length });
            router.push('/onboarding/regularity');
          }}
        />
      </ScrollView>
    </Screen>
  );
}
