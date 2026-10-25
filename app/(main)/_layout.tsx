import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="meal/[id]" />
      <Stack.Screen name="meal-slot" />
      <Stack.Screen name="buddy" />
      <Stack.Screen name="goal-history" />
      <Stack.Screen name="notification-settings" />
      <Stack.Screen name="health-information-sources" />
      <Stack.Screen name="account" />
      <Stack.Screen name="support" />
      <Stack.Screen name="about" />
      <Stack.Screen name="contact" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
