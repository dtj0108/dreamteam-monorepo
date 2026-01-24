import { Stack } from "expo-router";
import { View } from "react-native";

import { ProductSwitcher } from "@/components/ProductSwitcher";
import { Colors } from "@/constants/Colors";

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLeft: () => (
          <View style={{ paddingLeft: 16 }}>
            <ProductSwitcher />
          </View>
        ),
        headerTitle: "",
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="hub" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="finance" options={{ headerShown: false }} />
      <Stack.Screen name="sales" options={{ headerShown: false }} />
      <Stack.Screen name="team" options={{ headerShown: false }} />
      <Stack.Screen name="projects" options={{ headerShown: false }} />
      <Stack.Screen name="agents" options={{ headerShown: false }} />
      <Stack.Screen name="more" />
    </Stack>
  );
}

