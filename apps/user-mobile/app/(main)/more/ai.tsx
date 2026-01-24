import { View, Text } from "react-native";

export default function AIScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-bold text-foreground">AI Chat</Text>
      <Text className="mt-2 text-muted-foreground">
        Agents and chat interface
      </Text>
    </View>
  );
}


