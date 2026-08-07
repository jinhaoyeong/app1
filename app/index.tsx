import { Redirect } from 'expo-router';
import { useLumaStore } from '@/store/lumaStore';

export default function Index() {
  const onboardingComplete = useLumaStore((s) => s.profile.onboardingComplete);
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/today" />;
}
