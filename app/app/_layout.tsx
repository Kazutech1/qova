import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding/phone" />
      <Stack.Screen name="onboarding/otp" />
      <Stack.Screen name="onboarding/profile" />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="create-circle" options={{ presentation: 'modal' }} />
      <Stack.Screen name="join-circle" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
