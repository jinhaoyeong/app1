import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Caption, PrimaryButton, Screen } from '@/components/ui';
import { PhaseAura } from '@/components/PhaseAura';
import { radii, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppLock } from './AppLock';

/**
 * Shown instead of the app while locked. It deliberately reveals nothing —
 * no cycle day, no prediction, no name — because the whole point is that
 * someone holding the unlocked phone still learns nothing.
 */
export function LockScreen() {
  const insets = useSafeAreaInsets();
  const { colors, accent, accentGlow } = useTheme();
  const { authenticate, error } = useAppLock();
  const promptedOnce = useRef(false);

  useEffect(() => {
    // Offer the prompt straight away so unlocking is usually a single glance,
    // but only once — re-prompting after a cancel would trap the user in a
    // loop they cannot dismiss.
    if (promptedOnce.current) return;
    promptedOnce.current = true;
    authenticate();
  }, [authenticate]);

  return (
    <Screen>
      <PhaseAura phase="unknown" height={420} intensity={0.7} />
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.mega,
            paddingBottom: insets.bottom + spacing.mega,
          },
        ]}
      >
        <View style={styles.brandLockup}>
          <View style={[styles.brandMark, { backgroundColor: accent }]}>
            <View style={[styles.brandCore, { backgroundColor: accentGlow }]} />
          </View>
          <Text
            style={[
              typography.eyebrow,
              { color: colors.text, fontSize: 13, letterSpacing: 3 },
            ]}
          >
            LUMA
          </Text>
        </View>

        <View style={styles.middle}>
          <Text style={[typography.hero, { color: colors.text }]}>Locked</Text>
          <Body muted style={{ marginTop: spacing.md, maxWidth: 320 }}>
            Your cycle history is on this device and stays private until you
            unlock it.
          </Body>
          {error ? (
            <Text
              style={[
                typography.bodyItalic,
                { color: colors.period, marginTop: spacing.lg },
              ]}
            >
              {error}
            </Text>
          ) : null}
        </View>

        <View>
          <PrimaryButton
            label="Unlock"
            onPress={authenticate}
            icon="lock-open-outline"
          />
          <Caption style={styles.footNote}>
            Uses your device&apos;s own biometrics or passcode.
          </Caption>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: spacing.xxl,
    justifyContent: 'space-between',
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCore: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  footNote: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
