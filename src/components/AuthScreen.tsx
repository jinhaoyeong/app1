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
    verifyEmailCode,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [linkRequested, setLinkRequested] = useState(false);

  const pending = authStatus === 'sending_link';
  const verifying = authStatus === 'verifying';
  const linkSent = linkRequested;
  const disabled = pending || !configured;

  const submit = async () => {
    const sent = await sendSignInLink(email);
    if (sent) {
      setCode('');
      setLinkRequested(true);
    }
  };

  const submitCode = async () => {
    await verifyEmailCode(email, code);
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
            <View
              style={[styles.markCore, { backgroundColor: colors.accentGlow }]}
            />
          </View>
          <Eyebrow color={accent} style={{ marginTop: spacing.xxxl }}>
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
                  We sent a sign-in link to {email.trim().toLowerCase()}. Follow
                  it on this device to return to Luma. If the button does not
                  open Luma, enter the 6-digit code from that same email here.
                </Body>
                <Eyebrow color={colors.textSecondary}>Email code</Eyebrow>
                <TextInput
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="number-pad"
                  placeholder="000000"
                  placeholderTextColor={colors.textTertiary}
                  editable={!verifying}
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={() => void submitCode()}
                  style={[
                    styles.input,
                    styles.codeInput,
                    {
                      color: colors.text,
                      borderColor: colors.borderStrong,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  accessibilityLabel="Email verification code"
                />
                <PrimaryButton
                  label={verifying ? 'Checking…' : 'Verify code'}
                  disabled={verifying || code.length !== 6}
                  onPress={() => void submitCode()}
                  icon="arrow-forward"
                />
                {authError ? (
                  <Caption style={[styles.error, { color: colors.period }]}>
                    {authError}
                  </Caption>
                ) : null}
                <PrimaryButton
                  label="Use a different email"
                  variant="secondary"
                  icon="arrow-back"
                  onPress={() => {
                    setEmail('');
                    setCode('');
                    setLinkRequested(false);
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

          {!configured ? (
            <Caption style={{ marginTop: spacing.xxl, textAlign: 'center' }}>
              This build is waiting for Supabase environment variables. Add them
              before testing sign-in.
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
    marginTop: spacing.lg,
    lineHeight: 52,
  },
  intro: {
    maxWidth: 460,
    marginTop: spacing.xl,
    fontSize: 17,
    lineHeight: 26,
  },
  form: {
    marginTop: spacing.xxxl,
    padding: spacing.xxl,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.lg,
  },
  input: {
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    marginBottom: 0,
  },
  codeInput: {
    letterSpacing: 6,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  checkmark: {
    fontSize: 34,
    fontWeight: '700',
  },
  error: {
    marginTop: spacing.sm,
  },
});
