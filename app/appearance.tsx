import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Caption,
  Card,
  Chip,
  Screen,
  SectionTitle,
  Title,
} from '@/components/ui';
import { accents } from '@/theme/tokens';
import type { AccentTheme, ColorMode } from '@/types';
import { useLumaStore } from '@/store/lumaStore';
import { spacing } from '@/theme/tokens';

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const appearance = useLumaStore((s) => s.appearance);
  const update = useLumaStore((s) => s.updateAppearance);

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
        <Title style={{ marginTop: spacing.md }}>Appearance</Title>

        <Card style={{ marginTop: spacing.xxl }}>
          <SectionTitle>Theme</SectionTitle>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: spacing.md,
            }}
          >
            {(['system', 'light', 'dark'] as ColorMode[]).map((mode) => (
              <Chip
                key={mode}
                label={mode[0].toUpperCase() + mode.slice(1)}
                selected={appearance.colorMode === mode}
                onPress={() => update({ colorMode: mode })}
              />
            ))}
          </View>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>Accent</SectionTitle>
          <Body muted style={{ marginTop: spacing.sm }}>
            Muted accents — periods don&apos;t need to be bright red.
          </Body>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: spacing.md,
            }}
          >
            {(Object.keys(accents) as AccentTheme[]).map((key) => (
              <Chip
                key={key}
                label={accents[key].label}
                selected={appearance.accent === key}
                onPress={() => update({ accent: key })}
              />
            ))}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
