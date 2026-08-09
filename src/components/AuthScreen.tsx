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
  AppIcon,
  Body,
  Caption,
  DisplayText,
  Eyebrow,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing, typography } from '@/theme/tokens';
import { useAuth } from '@/auth/AuthProvider';

type AuthMode = 'sign_in' | 'sign_up';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { colors, accent, tint } = useTheme();
  const {
    authStatus,
    authError,
    configured,
    resetAuthFlow,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const pending =
    authStatus === 'signing_in' ||
    authStatus === 'signing_up' ||
    authStatus === 'oauth_redirect';
  const accountCreated = authStatus === 'account_created';
  const disabled = pending || !configured;
  const error = formError ?? authError;

  const handleFieldEdit = () => {
    setFormError(undefined);
    if (authStatus === 'error') resetAuthFlow();
  };

  const changeMode = (next: AuthMode) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormError(undefined);
    resetAuthFlow();
  };

  const submit = async () => {
    setFormError(undefined);
    if (mode === 'sign_up' && password !== confirmPassword) {
      setFormError('The passwords do not match.');
      return;
    }
    if (mode === 'sign_in') {
      await signInWithPassword(email, password);
    } else {
      await signUpWithPassword(email, password);
    }
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
          <View style={styles.brandRow}>
            <View style={[styles.mark, { backgroundColor: accent }]}>
              <View
                style={[
                  styles.markCore,
                  { backgroundColor: colors.accentGlow },
                ]}
              />
            </View>
            <Text style={[typography.eyebrow, { color: accent }]}>Luma</Text>
          </View>

          <DisplayText style={styles.title}>
            Your cycle,
            {'\n'}
            wherever you are.
          </DisplayText>
          <Body muted style={styles.intro}>
            Create an account or sign in to keep your profile, period history,
            symptoms, insights, and preparation list in sync across devices.
          </Body>

          <View
            style={[
              styles.form,
              { borderColor: colors.border, backgroundColor: tint(0.05) },
            ]}
          >
            <View
              style={[
                styles.modeSwitch,
                { backgroundColor: colors.surfaceMuted },
              ]}
              accessibilityRole="tablist"
            >
              {(['sign_in', 'sign_up'] as AuthMode[]).map((option) => {
                const active = mode === option;
                return (
                  <PressableScale
                    key={option}
                    onPress={() => changeMode(option)}
                    disabled={pending}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active, disabled: pending }}
                    accessibilityLabel={
                      option === 'sign_in' ? 'Sign in' : 'Create account'
                    }
                    style={[
                      styles.modeButton,
                      active && {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.bodyMedium,
                        { color: active ? colors.text : colors.textSecondary },
                      ]}
                    >
                      {option === 'sign_in' ? 'Sign in' : 'Create account'}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            {accountCreated ? (
              <View style={styles.successState}>
                <AppIcon name="checkmark-circle" size={34} color={accent} />
                <Text style={[typography.title, { color: colors.text }]}>
                  Account created
                </Text>
                <Body muted style={styles.successCopy}>
                  Your Luma account is ready. Check your inbox to verify your
                  email, then sign in with your password.
                </Body>
                <PrimaryButton
                  label="Continue to sign in"
                  onPress={() => changeMode('sign_in')}
                  icon="arrow-forward"
                />
              </View>
            ) : (
              <>
                <View style={styles.field}>
                  <Eyebrow color={colors.textSecondary}>Email address</Eyebrow>
                  <TextInput
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      handleFieldEdit();
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textTertiary}
                    editable={!disabled}
                    returnKeyType="next"
                    textContentType="emailAddress"
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
                </View>

                <View style={styles.field}>
                  <Eyebrow color={colors.textSecondary}>Password</Eyebrow>
                  <View
                    style={[
                      styles.passwordField,
                      {
                        borderColor: colors.borderStrong,
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <TextInput
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        handleFieldEdit();
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="Your password"
                      placeholderTextColor={colors.textTertiary}
                      editable={!disabled}
                      returnKeyType={mode === 'sign_up' ? 'next' : 'done'}
                      secureTextEntry={!showPassword}
                      textContentType={
                        mode === 'sign_up' ? 'newPassword' : 'password'
                      }
                      onSubmitEditing={() => {
                        if (mode === 'sign_in') void submit();
                      }}
                      style={[styles.passwordInput, { color: colors.text }]}
                      accessibilityLabel="Password"
                    />
                    <PressableScale
                      onPress={() => setShowPassword((current) => !current)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      style={styles.passwordToggle}
                    >
                      <AppIcon
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={19}
                        color={colors.textSecondary}
                      />
                    </PressableScale>
                  </View>
                  {mode === 'sign_up' ? (
                    <Caption style={styles.passwordHint}>
                      At least 8 characters
                    </Caption>
                  ) : null}
                </View>

                {mode === 'sign_up' ? (
                  <View style={styles.field}>
                    <Eyebrow color={colors.textSecondary}>
                      Confirm password
                    </Eyebrow>
                    <View
                      style={[
                        styles.passwordField,
                        {
                          borderColor: colors.borderStrong,
                          backgroundColor: colors.surface,
                        },
                      ]}
                    >
                      <TextInput
                        value={confirmPassword}
                        onChangeText={(value) => {
                          setConfirmPassword(value);
                          handleFieldEdit();
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="Repeat your password"
                        placeholderTextColor={colors.textTertiary}
                        editable={!disabled}
                        returnKeyType="done"
                        secureTextEntry={!showConfirmPassword}
                        textContentType="newPassword"
                        onSubmitEditing={() => void submit()}
                        style={[styles.passwordInput, { color: colors.text }]}
                        accessibilityLabel="Confirm password"
                      />
                      <PressableScale
                        onPress={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityLabel={
                          showConfirmPassword
                            ? 'Hide confirmation password'
                            : 'Show confirmation password'
                        }
                        style={styles.passwordToggle}
                      >
                        <AppIcon
                          name={
                            showConfirmPassword
                              ? 'eye-off-outline'
                              : 'eye-outline'
                          }
                          size={19}
                          color={colors.textSecondary}
                        />
                      </PressableScale>
                    </View>
                  </View>
                ) : null}

                <PrimaryButton
                  label={
                    pending
                      ? mode === 'sign_in'
                        ? 'Signing in…'
                        : 'Creating account…'
                      : mode === 'sign_in'
                        ? 'Sign in'
                        : 'Create account'
                  }
                  disabled={disabled}
                  onPress={() => void submit()}
                  icon="arrow-forward"
                />

                <View style={styles.separator}>
                  <View
                    style={[
                      styles.separatorLine,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <Text
                    style={[typography.caption, { color: colors.textTertiary }]}
                  >
                    or
                  </Text>
                  <View
                    style={[
                      styles.separatorLine,
                      { backgroundColor: colors.border },
                    ]}
                  />
                </View>

                <PressableScale
                  onPress={() => void signInWithGoogle()}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                  style={[
                    styles.googleButton,
                    {
                      borderColor: colors.borderStrong,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <AppIcon name="logo-google" size={18} color={colors.text} />
                  <Text style={[typography.bodyMedium, { color: colors.text }]}>
                    {authStatus === 'oauth_redirect'
                      ? 'Opening Google…'
                      : 'Continue with Google'}
                  </Text>
                </PressableScale>

                {error ? (
                  <Caption style={[styles.error, { color: colors.period }]}>
                    {error}
                  </Caption>
                ) : null}
              </>
            )}
          </View>

          {!configured ? (
            <Caption style={styles.environmentNote}>
              This build is waiting for Supabase environment variables. Add them
              before testing account access.
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
    marginTop: spacing.xxxl,
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
  modeSwitch: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radii.full,
    gap: spacing.xs,
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
  passwordField: {
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
  passwordToggle: {
    minWidth: 48,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordHint: {
    marginTop: -spacing.xs,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  separatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  googleButton: {
    minHeight: 56,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  successState: {
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  successCopy: {
    marginBottom: spacing.sm,
  },
  error: {
    marginTop: spacing.sm,
  },
  environmentNote: {
    marginTop: spacing.xxl,
    textAlign: 'center',
  },
});
