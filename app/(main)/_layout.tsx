import { Stack } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

export const unstable_settings = {
  anchor: '(drawer)',
};

export default function MainLayout() {
  const { theme } = useUnistyles();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Opaque so detail screens never show the navigator's default grey behind them.
        contentStyle: { backgroundColor: theme.colors.background.app },
      }}
    >
      <Stack.Screen name="(drawer)" />
      <Stack.Screen name="welcome" />
      <Stack.Screen
        name="chat"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [1],
          sheetGrabberVisible: true,
          sheetCornerRadius: theme.metrics.borderRadius.xl * 1.5,
          contentStyle: { backgroundColor: theme.colors.background.app },
        }}
      />
      <Stack.Screen name="meal/[id]" />
      <Stack.Screen name="goal-history" />
      <Stack.Screen name="buddy-stat/[axis]" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="reminders" />
      <Stack.Screen name="language" />
      <Stack.Screen name="health-sources" />
      <Stack.Screen name="account" />
      <Stack.Screen name="support" />
      <Stack.Screen name="about" />
      <Stack.Screen name="contact" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="dev-tools" />
    </Stack>
  );
}
