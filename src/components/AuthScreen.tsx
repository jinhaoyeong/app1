import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Caption,
  DataText,
  DisplayText,
  Eyebrow,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing, typography } from '@/theme/tokens';
import { useAuth } from '@/auth/AuthProvider';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { colors, accent, tint } = useTheme();
  const {
    authStatus,
    authError,
    configured,
    resetAuthFlow,
    sendSignInLink,
  } = useAuth();
  const [email, setEmail] = useState('');

  const pending = authStatus === 'sending_link';
  const linkSent = authStatus === 'link_sent';
  const disabled = pending || !configured;

  const submit = async () => {
    await sendSignInLink(email);
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + spacing.huge,
              paddingBottom: insets.bottom + spacing.huge,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.mark, { backgroundColor: accent }]}>
            <View style={[styles.markCore, { backgroundColor: colors.accentGlow }]} />
          </View>
          <Eyebrow color={accent} style={{ marginTop: spacing.xl }}>
            Luma account
          </Eyebrow>
          <DisplayText style={styles.title}>
            Your cycle,
            {'\n'}
            wherever you are.
          </DisplayText>
          <Body muted style={styles.intro}>
            Sign in once and your profile, period history, symptoms, insights,
            and preparation list stay in sync across your devices.
          </Body>

          <View
            style={[
              styles.form,
              { borderColor: colors.border, backgroundColor: tint(0.05) },
            ]}
          >
            {linkSent ? (
              <>
                <Text style={[styles.checkmark, { color: accent }]}>✓</Text>
                <Text style={[typography.title, { color: colors.text }]}>
                  Check your inbox
                </Text>
                <Body muted style={{ marginTop: spacing.sm }}>
                  We sent a sign-in link to {email.trim().toLowerCase()}.
                  Follow it on this device to return to Luma.
                </Body>
                <PrimaryButton
                  label="Use a different email"
                  variant="secondary"
                  icon="arrow-back"
                  onPress={() => {
                    setEmail('');
                    resetAuthFlow();
                  }}
                />
              </>
            ) : (
              <>
                <Eyebrow color={colors.textSecondary}>Email address</Eyebrow>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textTertiary}
                  editable={!pending}
                  returnKeyType="send"
                  onSubmitEditing={() => void submit()}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.borderStrong,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  accessibilityLabel="Email address"
                />
                <PrimaryButton
                  label={pending ? 'Sending…' : 'Send sign-in link'}
                  disabled={disabled}
                  onPress={() => void submit()}
                  icon="arrow-forward"
                />
                {authError ? (
                  <Caption style={[styles.error, { color: colors.period }]}>
                    {authError}
                  </Caption>
                ) : null}
              </>
            )}
          </View>

          <View style={styles.promise}>
            <DataText color={accent}>ONE UNIVERSAL ACTION</DataText>
            <Caption style={{ marginTop: spacing.sm }}>
              New and returning users use the same link. Luma never reveals
              whether an email already has an account.
            </Caption>
          </View>

          {!configured ? (
            <Caption style={{ marginTop: spacing.xl, textAlign: 'center' }}>
              This build is waiting for Supabase environment variables. Add
              them before testing sign-in.
            </Caption>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: spacing.xxl,
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
  title: {
    marginTop: spacing.md,
    lineHeight: 52,
  },
  intro: {
    maxWidth: 460,
    marginTop: spacing.lg,
    fontSize: 17,
    lineHeight: 26,
  },
  form: {
    marginTop: spacing.huge,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  input: {
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  checkmark: {
    fontSize: 34,
    fontWeight: '700',
  },
  error: {
    marginTop: spacing.sm,
  },
  promise: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.sm,
  },
});
