import { Stack } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/Colors";

export default function MoreLayout() {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="knowledge" options={{ headerShown: false }} />
      <Stack.Screen name="ai" options={{ title: "AI Chat" }} />
      <Stack.Screen
        name="settings"
        options={{
          title: "Settings",
          headerTransparent: false,
          headerStyle: { backgroundColor: Colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { color: Colors.foreground, fontWeight: "700" },
          headerLeft: () => (
            <View style={{ paddingLeft: 4 }}>
              <Pressable
                onPress={() => router.replace("/(main)/hub")}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingRight: 10 }}
              >
                <FontAwesome name="chevron-left" size={14} color={Colors.foreground} />
                <Text style={{ marginLeft: 6, fontSize: 15, fontWeight: "600", color: Colors.foreground }}>
                  Hub
                </Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <Stack.Screen name="legal" options={{ title: "Legal" }} />
      <Stack.Screen name="workspaces" options={{ title: "Workspaces" }} />
    </Stack>
  );
}
