import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppIcon,
  Body,
  Caption,
  DataText,
  Divider,
  Eyebrow,
  ListRow,
  PageHeader,
  PrimaryButton,
  Screen,
  SectionRule,
} from '@/components/ui';
import { Reveal } from '@/components/motion';
import { useLumaStore } from '@/store/lumaStore';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { confirmAsync, noticeAsync } from '@/ui/dialogs';
import { cancelAllNotifications } from '@/notifications/scheduler';
import { CONTRACEPTION_OPTIONS, GOAL_OPTIONS } from '@/data/catalog';
import { accents, radii, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export default function YouScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useLumaStore((s) => s.profile);
  const appearance = useLumaStore((s) => s.appearance);
  const logs = useLumaStore((s) => s.dailyLogs);
  const deleteAllData = useLumaStore((s) => s.deleteAllData);
  const loadDemoData = useLumaStore((s) => s.loadDemoData);
  const { colors, accent, tint } = useTheme();
  const { baseline } = useCycleIntelligence();

  const contraception = CONTRACEPTION_OPTIONS.find(
    (c) => c.value === profile.contraceptionType,
  );
  const goals = profile.trackingGoals
    .map((g) => GOAL_OPTIONS.find((o) => o.value === g)?.label ?? g)
    .join(' · ');
  const loggedDays = Object.keys(logs).length;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: 148,
            paddingHorizontal: spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Reveal index={0}>
          <PageHeader
            eyebrow="Your cycle belongs to you"
            title="You"
            subtitle="Everything Luma knows lives on this device."
          />
        </Reveal>

        <Reveal index={1}>
          <View
            style={[
              styles.profilePanel,
              { borderColor: colors.border, backgroundColor: tint(0.07) },
            ]}
          >
            <View style={styles.profileTop}>
              <View style={[styles.avatar, { backgroundColor: accent }]}>
                <Text
                  style={[
                    typography.title,
                    { color: colors.accentInk, fontSize: 22 },
                  ]}
                >
                  {(profile.displayName?.trim()?.[0] ?? 'L').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '700', fontSize: 18 }}>
                  {profile.displayName || 'Your private journal'}
                </Body>
                <Caption style={{ marginTop: 3 }}>
                  {goals || 'Choose what you want Luma to notice'}
                </Caption>
              </View>
            </View>

            <View style={[styles.statRow, { borderTopColor: colors.border }]}>
              <View style={styles.stat}>
                <Text
                  style={[
                    typography.title,
                    { color: colors.text, fontVariant: ['tabular-nums'] },
                  ]}
                >
                  {baseline.cycleCount}
                </Text>
                <Eyebrow>cycles</Eyebrow>
              </View>
              <View style={styles.stat}>
                <Text
                  style={[
                    typography.title,
                    { color: colors.text, fontVariant: ['tabular-nums'] },
                  ]}
                >
                  {loggedDays}
                </Text>
                <Eyebrow>logged</Eyebrow>
              </View>
              <View style={styles.stat}>
                <Text
                  style={[
                    typography.title,
                    { color: colors.text, fontVariant: ['tabular-nums'] },
                  ]}
                >
                  {baseline.averageCycleLength ?? '—'}
                </Text>
                <Eyebrow>avg days</Eyebrow>
              </View>
            </View>

            <View style={styles.localNote}>
              <AppIcon name="lock-closed" size={13} color={accent} />
              <DataText color={accent}>stored locally · never sold</DataText>
            </View>
          </View>
        </Reveal>

        <Reveal index={2}>
          <SectionRule label="Tracking" style={styles.sectionSpace} />
          <View style={styles.group}>
            <ListRow
              icon="medkit-outline"
              title="Health profile"
              detail={`Goals, cycle details, quick symptoms · ${
                contraception?.label ?? 'Contraception not set'
              }`}
              onPress={() => router.push('/health-profile')}
            />
            <Divider />
            <ListRow
              icon="leaf-outline"
              title="Period preparation"
              detail="A checklist for the days before your estimate"
              onPress={() => router.push('/preparation')}
            />
            <Divider />
            <ListRow
              icon="document-text-outline"
              title="Health summary"
              detail="A calm overview for a healthcare visit"
              onPress={() => router.push('/health-summary')}
            />
          </View>
        </Reveal>

        <Reveal index={3}>
          <SectionRule
            label="App"
            style={styles.sectionSpace}
            right={
              <View style={styles.swatchRow}>
                {(Object.keys(accents) as (keyof typeof accents)[]).map((k) => (
                  <View
                    key={k}
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: accents[k].color,
                        opacity: k === appearance.accent ? 1 : 0.32,
                      },
                    ]}
                  />
                ))}
              </View>
            }
          />
          <View style={styles.group}>
            <ListRow
              icon="color-palette-outline"
              title="Appearance"
              detail={`${appearance.colorMode} mode · ${accents[appearance.accent].label}`}
              onPress={() => router.push('/appearance')}
            />
            <Divider />
            <ListRow
              icon="notifications-outline"
              title="Notifications"
              detail="Useful by default. Never noisy."
              onPress={() => router.push('/notifications')}
            />
            <Divider />
            <ListRow
              icon="shield-checkmark-outline"
              title="Privacy"
              detail="App lock, exports, and local storage"
              onPress={() => router.push('/privacy')}
            />
          </View>
        </Reveal>

        <Reveal index={4}>
          <SectionRule label="For exploring" style={styles.sectionSpace} />
          <View style={{ gap: spacing.md }}>
            <PrimaryButton
              label="Load sample history"
              variant="secondary"
              onPress={() => {
                loadDemoData();
                noticeAsync({
                  title: 'Sample history loaded',
                  message:
                    'Explore Today and Insights with a mature personal pattern.',
                });
              }}
              icon="flask-outline"
            />
            <PrimaryButton
              label="Delete data and restart"
              variant="danger"
              onPress={async () => {
                const ok = await confirmAsync({
                  title: 'Reset?',
                  message:
                    'This clears all local data and returns to onboarding.',
                  confirmLabel: 'Reset',
                  destructive: true,
                });
                if (!ok) return;
                // A queued reminder must not survive the data it refers to.
                await cancelAllNotifications();
                deleteAllData();
                router.replace('/onboarding');
              }}
              icon="trash-outline"
            />
          </View>
        </Reveal>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  profilePanel: {
    marginTop: spacing.huge,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xxl,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.lg,
  },
  stat: {
    flex: 1,
  },
  localNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  sectionSpace: {
    marginTop: spacing.mega,
    marginBottom: spacing.sm,
  },
  group: {
    paddingVertical: spacing.xs,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 4,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
});
