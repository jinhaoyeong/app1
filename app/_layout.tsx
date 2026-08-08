import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
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

function RootNavigator() {
  // Reconciles the OS notification schedule with preferences and the current
  // prediction. Idempotent, so running it on every change is free.
  useNotificationSync();
  const { colors, isDark } = useTheme();
  const hydrated = useLumaStore((s) => s.hydrated);
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
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboardingComplete && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingComplete && inOnboarding) {
      router.replace('/(tabs)/today');
    }
  }, [hydrated, onboardingComplete, segments, router]);

  if (!hydrated || !fontsLoaded) {
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
    <>
      {/*
        THESIS: Luma is a living intelligence report for the body, not a pink tracker or a medical dashboard.
        OWN-WORLD: Expressive editorial — bone and ink surfaces, display type at tight tracking, a signature cycle ribbon of blended light, mono data marks, and hairline section rules.
        STORY: Today answers "how far away, where am I, what does it mean, what can I do" before a single scroll.
        FIRST VIEWPORT: Masthead, the days-away number at display scale, the cycle ribbon with a marker on today, then one useful read.
        FORM: Native tabs replaced by a floating dock; Log is the one accent action; every press springs, every section arrives.
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
      */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'default',
        }}
      >
        <Stack.Screen name="index" />
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
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppLockProvider>
            <RootNavigator />
          </AppLockProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
