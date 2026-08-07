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
          <Caption style={{ color: accent }}>Luma</Caption>
          <HeroText style={{ marginTop: spacing.xxl }}>
            Understand your cycle.
          </HeroText>
          <Body muted style={{ marginTop: spacing.lg, maxWidth: 320 }}>
            Not just your calendar. Track your period, understand patterns, and
            learn what is normal for you — privately.
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
