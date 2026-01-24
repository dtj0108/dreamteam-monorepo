import { Stack } from "expo-router";

export default function KnowledgeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="search" />
      <Stack.Screen name="[pageId]" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="new" options={{ presentation: "modal" }} />
    </Stack>
  );
}
