import { Stack } from "expo-router";

export default function ProjectDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="list" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="milestones" />
      <Stack.Screen name="knowledge" />
      <Stack.Screen name="activity" />
    </Stack>
  );
}
