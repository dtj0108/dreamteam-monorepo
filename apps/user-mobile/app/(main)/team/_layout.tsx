import { Stack } from "expo-router";

export default function TeamLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="channels/[id]" />
      <Stack.Screen name="channels/new" />
      <Stack.Screen name="dm/[id]" />
      <Stack.Screen name="agents/[id]" />
      <Stack.Screen name="messages" />
      <Stack.Screen
        name="meeting/[id]"
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}

