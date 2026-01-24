import { View, Text, Pressable, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import type { AgentWithHireStatus } from "@/lib/types/agents";

interface AgentCardGridProps {
  agent: AgentWithHireStatus;
  stats?: {
    conversations: number;
    completed: number;
    scheduled: number;
  };
  onPress: () => void;
  onHire?: () => void;
}

export function AgentCardGrid({
  agent,
  stats,
  onPress,
  onHire,
}: AgentCardGridProps) {
  const isHired = agent.isHired;

  return (
    <Pressable
      className="mb-3 flex-1 rounded-xl bg-muted p-4 active:opacity-70"
      onPress={onPress}
    >
      {/* Avatar with gradient-like background */}
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-xl bg-background">
        {agent.avatar_url ? (
          <Image
            source={{ uri: agent.avatar_url }}
            className="h-14 w-14 rounded-xl"
          />
        ) : (
          <Text className="text-3xl">✨</Text>
        )}
      </View>

      {/* Top-right hired badge */}
      {isHired && (
        <View className="absolute right-3 top-3">
          <View
            className="h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: Colors.success + "20" }}
          >
            <FontAwesome name="check" size={10} color={Colors.success} />
          </View>
        </View>
      )}

      {/* Name */}
      <Text
        className="text-base font-semibold text-foreground"
        numberOfLines={1}
      >
        {agent.name}
      </Text>

      {/* Content - stats or description */}
      {isHired && stats ? (
        <View className="mt-2 gap-1">
          <View className="flex-row items-center">
            <View
              className="h-5 w-5 items-center justify-center rounded"
              style={{ backgroundColor: Colors.primary + "20" }}
            >
              <FontAwesome
                name="comment"
                size={10}
                color={Colors.primary}
              />
            </View>
            <Text className="ml-2 text-sm text-muted-foreground">
              {stats.conversations} conversations
            </Text>
          </View>
          <View className="flex-row items-center">
            <View
              className="h-5 w-5 items-center justify-center rounded"
              style={{ backgroundColor: Colors.success + "20" }}
            >
              <FontAwesome
                name="check"
                size={10}
                color={Colors.success}
              />
            </View>
            <Text className="ml-2 text-sm text-muted-foreground">
              {stats.completed} completed
            </Text>
          </View>
          <View className="flex-row items-center">
            <View
              className="h-5 w-5 items-center justify-center rounded"
              style={{ backgroundColor: "#8b5cf6" + "20" }}
            >
              <FontAwesome
                name="calendar"
                size={10}
                color="#8b5cf6"
              />
            </View>
            <Text className="ml-2 text-sm text-muted-foreground">
              {stats.scheduled} scheduled
            </Text>
          </View>
        </View>
      ) : (
        <View className="mt-2">
          <Text
            className="text-sm text-muted-foreground"
            numberOfLines={2}
          >
            {agent.user_description || agent.description || "No description available"}
          </Text>
        </View>
      )}

      {/* Button */}
      <Pressable
        className={`mt-4 items-center rounded-lg py-2.5 ${
          isHired ? "bg-background" : "bg-primary"
        } active:opacity-70`}
        onPress={isHired ? onPress : onHire}
      >
        <Text
          className={`text-sm font-medium ${
            isHired ? "text-primary" : "text-white"
          }`}
        >
          {isHired ? "Meet →" : "Hire Agent"}
        </Text>
      </Pressable>
    </Pressable>
  );
}
