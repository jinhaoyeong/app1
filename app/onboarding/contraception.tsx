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
import { CONTRACEPTION_OPTIONS } from '@/data/catalog';
import type { ContraceptionType } from '@/types';
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';
import { OnboardingProgress } from '@/components/OnboardingProgress';

export default function ContraceptionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const patch = useLumaStore((s) => s.patchOnboardingDraft);
  const [value, setValue] = useState<ContraceptionType | undefined>();

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
        <OnboardingProgress step={5} />
        <Title>Do you use hormonal contraception?</Title>
        <Body muted style={{ marginTop: spacing.sm }}>
          This helps us avoid showing cycle information that may not apply to
          you.
        </Body>
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
        <View style={{ flex: 1 }} />
        <PrimaryButton
          label="Continue"
          disabled={!value}
          onPress={() => {
            patch({ contraceptionType: value });
            router.push('/onboarding/privacy');
          }}
        />
      </ScrollView>
    </Screen>
  );
}
