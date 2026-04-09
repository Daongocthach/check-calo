import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="food-form" />
    </Stack>
  );
}
