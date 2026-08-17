import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useLumaStore } from '@/store/lumaStore';
import { AppLockProvider, useAppLock } from '@/security/AppLock';
import { LockScreen } from '@/security/LockScreen';
import { useNotificationSync } from '@/notifications/useNotificationSync';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { AUTH_ROUTE } from '@/auth/routes';
import { PrimaryButton, Body, Caption, Screen } from '@/components/ui';
import { WebViewportLock } from '@/components/WebViewportLock';
import { WebEdgeToEdgeInsets } from '@/components/WebEdgeToEdgeInsets';
import { spacing } from '@/theme/tokens';

function SyncStatusBanner() {
  const { colors } = useTheme();
  const syncStatus = useLumaStore((s) => s.syncStatus);
  const syncError = useLumaStore((s) => s.syncError);
  if (!syncError || (syncStatus !== 'offline' && syncStatus !== 'error')) {
    return null;
  }
  return (
    <View
      style={{
        backgroundColor:
          syncStatus === 'offline' ? `${colors.period}18` : colors.surfaceMuted,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.sm,
      }}
    >
      <Caption
        style={{
          color: syncStatus === 'offline' ? colors.period : colors.text,
        }}
      >
        {syncError}
      </Caption>
    </View>
  );
}

function CloudHydrationError() {
  const { colors } = useTheme();
  const { authError, retryHydration, signOut } = useAuth();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxl,
        backgroundColor: colors.background,
      }}
    >
      <Body style={{ textAlign: 'center', fontWeight: '700' }}>
        Your account could not be loaded.
      </Body>
      <Caption style={{ marginTop: spacing.md, textAlign: 'center' }}>
        {authError ?? 'Internet is required before Luma can show cycle data.'}
      </Caption>
      <View
        style={{
          width: '100%',
          maxWidth: 360,
          gap: spacing.md,
          marginTop: spacing.xxl,
        }}
      >
        <PrimaryButton
          label="Try again"
          onPress={() => void retryHydration()}
        />
        <PrimaryButton
          label="Sign out"
          variant="secondary"
          onPress={() => void signOut()}
        />
      </View>
    </View>
  );
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Luma screen failed to render', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Screen>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xxl,
          }}
        >
          <Body style={{ textAlign: 'center', fontWeight: '700' }}>
            Luma needs a quick restart.
          </Body>
          <Caption style={{ marginTop: spacing.md, textAlign: 'center' }}>
            Your saved account data is safe. Reload the screen to continue.
          </Caption>
          <View
            style={{ width: '100%', maxWidth: 360, marginTop: spacing.xxl }}
          >
            <PrimaryButton
              label="Reload Luma"
              onPress={() => {
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                  window.location.reload();
                  return;
                }
                this.setState({ error: null });
              }}
              icon="refresh"
            />
          </View>
        </View>
      </Screen>
    );
  }
}

function RootNavigator() {
  // Reconciles the OS notification schedule with preferences and the current
  // prediction. Idempotent, so running it on every change is free.
  useNotificationSync();
  const { colors, isDark } = useTheme();
  const hydrated = useLumaStore((s) => s.hydrated);
  const { authStatus, session } = useAuth();
  const { locked } = useAppLock();
  // The display serif carries the brand voice; hold the first paint for it
  // rather than flashing system type and reflowing every heading.
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    Fraunces_700Bold,
  });
  const onboardingComplete = useLumaStore((s) => s.profile.onboardingComplete);
  const segments = useSegments();
  const segmentKey = segments.join('/');
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const redirectRef = useRef<string | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute('content', colors.background);
    const statusBar = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    );
    statusBar?.setAttribute(
      'content',
      isDark ? 'black-translucent' : 'default',
    );
    document.documentElement.style.backgroundColor = colors.background;
    document.body.style.backgroundColor = colors.background;
  }, [colors.background, isDark]);

  useEffect(() => {
    if (authStatus === 'loading' || authStatus === 'hydrating') return;
    if (!rootNavigationState?.key) return;
    const inAuth = segmentKey === 'auth' || segmentKey.startsWith('auth/');
    if (!session) {
      redirectRef.current = null;
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
      if (!inAuth) router.replace(AUTH_ROUTE);
      return;
    }
    if (authStatus !== 'signed_in' || !hydrated) return;
    const inOnboarding =
      segmentKey === 'onboarding' || segmentKey.startsWith('onboarding/');
    const destination =
      !onboardingComplete && !inOnboarding
        ? '/onboarding'
        : onboardingComplete && inOnboarding
          ? '/(tabs)/today'
          : null;
    if (!destination) {
      // Keep a pending handoff alive while Expo Router is between route
      // states. Clearing the guard during that transient state can schedule
      // replace() repeatedly and trip React's maximum-update-depth guard.
      const settled = onboardingComplete
        ? segmentKey === '(tabs)' || segmentKey.startsWith('(tabs)/')
        : inOnboarding;
      if (settled) redirectRef.current = null;
      return;
    }
    if (redirectRef.current === destination) return;
    redirectRef.current = destination;
    // Let the current Stack commit before replacing it. This avoids a native
    // navigation race when the account hydration state changes in the same
    // render as the final onboarding action.
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = setTimeout(() => {
      redirectTimerRef.current = null;
      try {
        router.replace(destination);
      } catch (error) {
        redirectRef.current = null;
        console.error('Luma route handoff failed', error);
      }
    }, 0);
  }, [
    authStatus,
    hydrated,
    onboardingComplete,
    rootNavigationState?.key,
    segmentKey,
    router,
    session,
  ]);

  if (!fontsLoaded || authStatus === 'loading' || authStatus === 'hydrating') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (session && authStatus === 'error') return <CloudHydrationError />;

  if (!session) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'default',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen name="auth/confirm" />
        </Stack>
      </View>
    );
  }

  // Rendered instead of the navigator, not over it, so no screen behind the
  // lock is ever composed or briefly visible during a transition.
  if (locked) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <LockScreen />
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/*
        THESIS: Luma is a living intelligence report for the body, not a pink tracker or a medical dashboard.
        OWN-WORLD: Expressive editorial — bone and ink surfaces, display type at tight tracking, a signature cycle ribbon of blended light, mono data marks, and hairline section rules.
        STORY: Today answers "how far away, where am I, what does it mean, what can I do" before a single scroll.
        FIRST VIEWPORT: Masthead, the days-away number at display scale, the cycle ribbon with a marker on today, then one useful read.
        FORM: Native tabs replaced by a floating dock; Log is the one accent action; every press springs, every section arrives.
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
      */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SyncStatusBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'default',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="auth/confirm" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="log"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="day/[date]" options={{ presentation: 'card' }} />
        <Stack.Screen name="preparation" />
        <Stack.Screen name="health-profile" />
        <Stack.Screen name="health-summary" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="appearance" />
        <Stack.Screen name="notifications" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, height: '100%' }}>
      <WebViewportLock />
      <SafeAreaProvider style={{ flex: 1, height: '100%' }}>
        <WebEdgeToEdgeInsets>
          <ThemeProvider>
            <AuthProvider>
              <AppLockProvider>
                <AppErrorBoundary>
                  <RootNavigator />
                </AppErrorBoundary>
              </AppLockProvider>
            </AuthProvider>
          </ThemeProvider>
        </WebEdgeToEdgeInsets>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
