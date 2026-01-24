import { Stack } from "expo-router";

export default function ReportsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="funnel" />
      <Stack.Screen name="deals" />
      <Stack.Screen name="activities" />
      <Stack.Screen name="trends" />
    </Stack>
  );
}
