import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Body, Caption, PrimaryButton } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { AUTH_ROUTE } from '@/auth/routes';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export default function AuthCallbackRoute() {
  const params = useLocalSearchParams<{
    code?: string;
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  }>();
  const { processAuthUrl, authStatus, authError } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    let url: string | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      url = window.location.href;
    } else if (params.code) {
      url = `luma://auth/callback?code=${encodeURIComponent(params.code)}`;
    } else if (params.access_token && params.refresh_token) {
      url = `luma://auth/callback#access_token=${encodeURIComponent(
        params.access_token,
      )}&refresh_token=${encodeURIComponent(params.refresh_token)}`;
    } else if (params.error) {
      url = `luma://auth/callback?error=${encodeURIComponent(
        params.error,
      )}&error_description=${encodeURIComponent(params.error_description ?? '')}`;
    }
    if (url) void processAuthUrl(url);
  }, [
    params.code,
    params.access_token,
    params.refresh_token,
    params.error,
    params.error_description,
    processAuthUrl,
  ]);

  if (authStatus === 'error') {
    return (
      <Screen>
        <View style={styles.center}>
          <Body style={{ textAlign: 'center', fontWeight: '700' }}>
            We couldn’t confirm that sign-in link.
          </Body>
          <Caption style={{ marginTop: spacing.md, textAlign: 'center' }}>
            {authError ??
              'The link may have expired. Request a new one from Luma.'}
          </Caption>
          <View
            style={{ width: '100%', maxWidth: 360, marginTop: spacing.xxl }}
          >
            <PrimaryButton
              label="Back to sign in"
              onPress={() => router.replace(AUTH_ROUTE)}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Body style={{ marginTop: 18 }}>Returning to Luma…</Body>
        <Caption style={{ marginTop: 8, textAlign: 'center' }}>
          Your sign-in is being confirmed securely.
        </Caption>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
