import { Redirect } from 'expo-router';
import { useLumaStore } from '@/store/lumaStore';
import { useAuth } from '@/auth/AuthProvider';
import { AUTH_ROUTE } from '@/auth/routes';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export default function Index() {
  const { session, authStatus } = useAuth();
  const { colors } = useTheme();
  const onboardingComplete = useLumaStore((s) => s.profile.onboardingComplete);
  if (!session && authStatus !== 'loading')
    return <Redirect href={AUTH_ROUTE} />;
  if (authStatus !== 'signed_in') {
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
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/today" />;
}
