import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppIcon, Body, SectionTitle, DataText } from '@/components/ui';
import { useLumaStore } from '@/store/lumaStore';
import { radii, spacing } from '@/theme/tokens';
import {
  OnboardingContinue,
  OnboardingFrame,
} from '@/components/OnboardingFrame';
import { useTheme } from '@/theme/ThemeProvider';

const COMMITMENTS = [
  {
    icon: 'lock-closed-outline',
    title: 'Private by design',
    body: 'Your health information stays on this device. Sync is never automatic.',
    mark: '01',
  },
  {
    icon: 'eye-off-outline',
    title: 'No reproductive advertising',
    body: 'Your reproductive data is never used to build an advertising profile, and never sold.',
    mark: '02',
  },
  {
    icon: 'options-outline',
    title: 'You stay in control',
    body: 'Export or delete everything from You → Privacy. No support email required.',
    mark: '03',
  },
] as const;

export default function PrivacyOnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useLumaStore((s) => s.completeOnboarding);
  const { colors, accent, tint } = useTheme();

  return (
    <OnboardingFrame
      step={6}
      title="Your cycle belongs to you."
      description="Privacy is part of the product, not fine print."
      onBack={() => router.back()}
      footer={
        <OnboardingContinue
          label="Start tracking"
          onPress={() => {
            completeOnboarding();
            router.replace('/(tabs)/today');
          }}
        />
      }
    >
      <View style={styles.stack}>
        {COMMITMENTS.map((c, i) => (
          <View
            key={c.title}
            style={[
              styles.row,
              {
                borderTopColor: colors.border,
                borderBottomColor: colors.border,
                borderBottomWidth:
                  i === COMMITMENTS.length - 1 ? StyleSheet.hairlineWidth : 0,
              },
            ]}
          >
            <View style={[styles.mark, { backgroundColor: tint(0.14) }]}>
              <AppIcon name={c.icon} size={18} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowHead}>
                <SectionTitle style={{ flex: 1 }}>{c.title}</SectionTitle>
                <DataText>{c.mark}</DataText>
              </View>
              <Body muted style={{ marginTop: spacing.xs }}>
                {c.body}
              </Body>
            </View>
          </View>
        ))}
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  stack: {
    marginTop: -spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
