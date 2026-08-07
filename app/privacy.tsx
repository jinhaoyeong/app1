import React from 'react';
import { Alert, Pressable, ScrollView, Share, Switch, View } from 'react-native';
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
import { exportLogsCsv, exportLogsJson } from '@/engine/summary';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accent } = useTheme();
  const appearance = useLumaStore((s) => s.appearance);
  const updateAppearance = useLumaStore((s) => s.updateAppearance);
  const deleteAllData = useLumaStore((s) => s.deleteAllData);
  const episodes = useLumaStore((s) => s.periodEpisodes);
  const logs = useLumaStore((s) => s.dailyLogs);
  const profile = useLumaStore((s) => s.profile);

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
        <Title style={{ marginTop: spacing.md }}>Your privacy</Title>

        <Card style={{ marginTop: spacing.xxl }}>
          <SectionTitle>App lock</SectionTitle>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: spacing.md,
            }}
          >
            <Body>Require device biometrics</Body>
            <Switch
              value={appearance.biometricLock}
              onValueChange={(v) => updateAppearance({ biometricLock: v })}
              trackColor={{ true: accent }}
            />
          </View>
          <Caption style={{ marginTop: spacing.sm }}>
            Uses your device lock when available. Preference is stored locally.
          </Caption>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>Discreet mode</SectionTitle>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: spacing.md,
            }}
          >
            <Body>Hide sensitive wording</Body>
            <Switch
              value={appearance.discreetMode}
              onValueChange={(v) => updateAppearance({ discreetMode: v })}
              trackColor={{ true: accent }}
            />
          </View>
          <Caption style={{ marginTop: spacing.sm }}>
            Notifications become “You have a Luma update” instead of period
            details.
          </Caption>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>Advertising</SectionTitle>
          <Body muted style={{ marginTop: spacing.sm }}>
            Your reproductive data is never used for targeted advertising.
          </Body>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <SectionTitle>Storage</SectionTitle>
          <Body muted style={{ marginTop: spacing.sm }}>
            Local-first on this device. No account required for MVP tracking.
          </Body>
        </Card>

        <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
          <PrimaryButton
            label="Export JSON"
            variant="secondary"
            onPress={() =>
              Share.share({
                message: exportLogsJson({ episodes, logs, profile }),
                title: 'luma-export.json',
              })
            }
          />
          <PrimaryButton
            label="Export CSV"
            variant="secondary"
            onPress={() =>
              Share.share({
                message: exportLogsCsv(logs),
                title: 'luma-logs.csv',
              })
            }
          />
          <PrimaryButton
            label="Delete all my data"
            variant="ghost"
            onPress={() => {
              Alert.alert(
                'Delete everything?',
                'This permanently removes cycle history, logs, and settings from this device.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      deleteAllData();
                      router.replace('/onboarding');
                    },
                  },
                ],
              );
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
