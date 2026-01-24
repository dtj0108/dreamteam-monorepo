import { View, Text, Pressable, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { Agent } from "@/lib/types/team";

interface AgentCardProps {
  agent: Agent;
  onPress: () => void;
}

export function AgentCard({ agent, onPress }: AgentCardProps) {
  return (
    <Pressable
      className="mb-3 rounded-xl bg-muted p-4 active:opacity-70"
      onPress={onPress}
    >
      <View className="flex-row">
        {/* Avatar/Emoji */}
        <View className="h-14 w-14 items-center justify-center rounded-xl bg-background">
          {agent.avatar_url ? (
            <Image
              source={{ uri: agent.avatar_url }}
              className="h-14 w-14 rounded-xl"
            />
          ) : (
            <Text className="text-3xl">{agent.emoji}</Text>
          )}
        </View>

        {/* Content */}
        <View className="ml-4 flex-1">
          <Text className="text-lg font-semibold text-foreground">
            {agent.name}
          </Text>
          <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={2}>
            {agent.description}
          </Text>

          {/* Capabilities */}
          {agent.capabilities.length > 0 && (
            <View className="mt-2 flex-row flex-wrap gap-1">
              {agent.capabilities.slice(0, 3).map((capability) => (
                <View
                  key={capability}
                  className="rounded-full bg-primary/10 px-2 py-0.5"
                >
                  <Text className="text-xs font-medium text-primary">
                    {capability}
                  </Text>
                </View>
              ))}
              {agent.capabilities.length > 3 && (
                <View className="rounded-full bg-muted px-2 py-0.5">
                  <Text className="text-xs font-medium text-muted-foreground">
                    +{agent.capabilities.length - 3}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Arrow */}
        <View className="justify-center">
          <FontAwesome
            name="chevron-right"
            size={14}
            color={Colors.mutedForeground}
          />
        </View>
      </View>
    </Pressable>
  );
}
