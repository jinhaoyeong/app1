import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Caption,
  HeroText,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accent } = useTheme();

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + spacing.xxxl,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xxl,
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Caption style={{ color: accent, letterSpacing: 1 }}>LUMA</Caption>
          <HeroText style={{ marginTop: spacing.xxl }}>
            Understand your cycle.
          </HeroText>
          <HeroText style={{ marginTop: spacing.sm, fontSize: 28, opacity: 0.85 }}>
            Not just your calendar.
          </HeroText>
          <Body muted style={{ marginTop: spacing.xl, maxWidth: 320 }}>
            Track your period, understand patterns and learn what is normal for
            you — privately, calmly, without the noise.
          </Body>
        </View>
        <PrimaryButton
          label="Continue"
          onPress={() => router.push('/onboarding/goals')}
        />
      </View>
    </Screen>
  );
}
