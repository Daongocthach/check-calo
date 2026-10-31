import { useLocalSearchParams } from 'expo-router';
import { OnboardingScreen } from '@/features/profile/components/onboarding';

export default function WelcomeRoute() {
  const { mode, restart } = useLocalSearchParams<{ mode?: string; restart?: string }>();
  return <OnboardingScreen editing={mode === 'edit'} restart={restart === '1'} />;
}
