import React from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Caption,
  Card,
  Screen,
  SectionTitle,
  Title,
} from '@/components/ui';
import { useLumaStore } from '@/store/lumaStore';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accent } = useTheme();
  const notifications = useLumaStore((s) => s.notifications);
  const update = useLumaStore((s) => s.updateNotifications);
  const discreet = useLumaStore((s) => s.appearance.discreetMode);

  const rows: {
    key: keyof typeof notifications;
    label: string;
    hint: string;
  }[] = [
    {
      key: 'periodPrediction',
      label: 'Period prediction',
      hint: 'When your expected window shifts',
    },
    {
      key: 'periodPreparation',
      label: 'Period preparation',
      hint: 'A few days before your estimated window',
    },
    {
      key: 'dailyLog',
      label: 'Daily log reminder',
      hint: 'Only if you want a gentle nudge',
    },
    {
      key: 'patternDiscovered',
      label: 'Pattern discovered',
      hint: 'When a repeating pattern becomes clear',
    },
    {
      key: 'importantChange',
      label: 'Important change',
      hint: 'When something differs from your baseline',
    },
    {
      key: 'showDetailedText',
      label: 'Detailed notification text',
      hint: discreet
        ? 'Disabled while discreet mode is on'
        : 'Show period details on the lock screen',
    },
  ];

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
        <Title style={{ marginTop: spacing.md }}>Notifications</Title>
        <Body muted style={{ marginTop: spacing.sm }}>
          Useful by default. Never noisy. Each category is independent.
        </Body>

        {rows.map((row) => (
          <Card key={row.key} style={{ marginTop: spacing.lg }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <SectionTitle>{row.label}</SectionTitle>
                <Caption style={{ marginTop: spacing.sm }}>{row.hint}</Caption>
              </View>
              <Switch
                value={notifications[row.key]}
                disabled={row.key === 'showDetailedText' && discreet}
                onValueChange={(v) => update({ [row.key]: v })}
                trackColor={{ true: accent }}
              />
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
