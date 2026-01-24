import { Stack } from "expo-router";

export default function SalesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="leads/[id]" />
      <Stack.Screen name="leads/new" />
      <Stack.Screen name="contacts/new" />
      <Stack.Screen name="activities/new" />
      <Stack.Screen name="deals/[id]" />
      <Stack.Screen name="deals/new" />
      <Stack.Screen name="reports" />
    </Stack>
  );
}

