import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Body,
  Caption,
  DisplayText,
  Eyebrow,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { AUTH_ROUTE } from '@/auth/routes';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export default function AuthConfirmRoute() {
  const params = useLocalSearchParams<{ token_hash?: string | string[] }>();
  const router = useRouter();
  const { colors, accent } = useTheme();
  const { authError, authStatus, session, verifyTokenHash } = useAuth();
  const [attempted, setAttempted] = useState(false);

  const tokenHash = useMemo(() => {
    const value = params.token_hash;
    return Array.isArray(value) ? value[0] : value;
  }, [params.token_hash]);
  const busy =
    attempted && (authStatus === 'verifying' || authStatus === 'hydrating');

  useEffect(() => {
    if (session && authStatus === 'signed_in') {
      router.replace('/');
    }
  }, [authStatus, router, session]);

  const confirm = async () => {
    if (!tokenHash) return;
    setAttempted(true);
    const verified = await verifyTokenHash(tokenHash);
    if (!verified) setAttempted(false);
  };

  return (
    <Screen>
      <View style={styles.center}>
        <View style={[styles.mark, { backgroundColor: accent }]}>
          <View
            style={[styles.markCore, { backgroundColor: colors.accentGlow }]}
          />
        </View>
        <Eyebrow color={accent} style={styles.eyebrow}>
          Luma sign in
        </Eyebrow>
        <DisplayText style={styles.title}>Ready when you are.</DisplayText>
        <Body muted style={styles.copy}>
          Tap once to securely confirm this email and return to your Luma
          account.
        </Body>
        <View style={styles.actions}>
          <PrimaryButton
            label={busy ? 'Confirming…' : 'Continue to Luma'}
            disabled={!tokenHash || busy}
            onPress={() => void confirm()}
            icon="arrow-forward"
          />
          {authError ? (
            <Caption style={[styles.error, { color: colors.period }]}>
              {authError}
            </Caption>
          ) : !tokenHash ? (
            <Caption style={[styles.error, { color: colors.period }]}>
              This sign-in link is incomplete. Request a new one from Luma.
            </Caption>
          ) : null}
          <PrimaryButton
            label="Back to sign in"
            variant="secondary"
            onPress={() => router.replace(AUTH_ROUTE)}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  mark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markCore: {
    width: 19,
    height: 19,
    borderRadius: 10,
  },
  eyebrow: {
    marginTop: spacing.xxl,
  },
  title: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  copy: {
    maxWidth: 440,
    marginTop: spacing.lg,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 26,
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    marginTop: spacing.xxxl,
  },
  error: {
    textAlign: 'center',
  },
});
