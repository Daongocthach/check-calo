import { Stack } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

export const unstable_settings = {
  anchor: 'login',
};

export default function AuthLayout() {
  const { theme } = useUnistyles();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background.app },
      }}
    />
  );
}
