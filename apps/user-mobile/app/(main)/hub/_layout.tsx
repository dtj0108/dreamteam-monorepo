import { Stack } from "expo-router";

export default function HubLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="support"
        options={{
          title: "Support & Bugs",
          headerBackTitle: "Hub",
        }}
      />
    </Stack>
  );
}
