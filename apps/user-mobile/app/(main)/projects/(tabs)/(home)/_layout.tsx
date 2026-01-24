import { Stack } from "expo-router";

export default function ProjectsHomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="tasks" />
    </Stack>
  );
}
