import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Caption,
  Card,
  PrimaryButton,
  Screen,
  SectionTitle,
  Title,
} from '@/components/ui';
import { useLumaStore } from '@/store/lumaStore';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export default function PreparationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accent } = useTheme();
  const items = useLumaStore((s) => s.preparationItems);
  const setItem = useLumaStore((s) => s.setPreparationItem);
  const { predictionWindow, confidenceText } = useCycleIntelligence();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xxl,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Caption>Back</Caption>
        </Pressable>
        <Title style={{ marginTop: spacing.md }}>
          Prepare for your period
        </Title>
        <Body muted style={{ marginTop: spacing.sm }}>
          Your period may arrive in approximately {predictionWindow ?? 'a few days'}.
          {confidenceText ? ` ${confidenceText}.` : ''}
        </Body>

        <Card style={{ marginTop: spacing.xxl }}>
          <SectionTitle>Checklist</SectionTitle>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setItem(item.id, !item.checked)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.checked }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: spacing.lg,
                gap: spacing.md,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: item.checked ? accent : '#C4C0BA',
                  backgroundColor: item.checked ? accent : 'transparent',
                }}
              />
              <Body
                style={{
                  textDecorationLine: item.checked ? 'line-through' : 'none',
                  opacity: item.checked ? 0.55 : 1,
                }}
              >
                {item.label}
              </Body>
            </Pressable>
          ))}
        </Card>

        <Body muted style={{ marginTop: spacing.xl }}>
          Preferences are remembered across cycles. This is practical support —
          not medical advice.
        </Body>

        <View style={{ marginTop: spacing.xxl }}>
          <PrimaryButton label="Done" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}
