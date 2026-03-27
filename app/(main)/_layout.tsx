import { Stack } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';
import { AppHeader } from '@/common/components/AppHeader';

export default function MainLayout() {
  const { theme } = useUnistyles();

  return (
    <Stack
      screenOptions={{
        header: () => <AppHeader />,
        contentStyle: { backgroundColor: theme.colors.background.app },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="food-result" />
      <Stack.Screen name="manual-food-entry" />
    </Stack>
  );
}
