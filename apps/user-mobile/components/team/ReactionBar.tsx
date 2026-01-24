import { View, Text, Pressable, ScrollView } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { Reaction } from "@/lib/types/team";

interface ReactionBarProps {
  reactions: Reaction[];
  onReactionPress: (emoji: string) => void;
  onAddReaction: () => void;
}

export function ReactionBar({
  reactions,
  onReactionPress,
  onAddReaction,
}: ReactionBarProps) {
  if (reactions.length === 0) return null;

  return (
    <View className="mt-2 flex-row flex-wrap gap-1">
      {reactions.map((reaction) => (
        <Pressable
          key={reaction.emoji}
          className={`flex-row items-center rounded-full px-2 py-1 ${
            reaction.includes_me ? "bg-primary/20" : "bg-muted"
          }`}
          onPress={() => onReactionPress(reaction.emoji)}
        >
          <Text className="text-sm">{reaction.emoji}</Text>
          <Text
            className={`ml-1 text-xs font-medium ${
              reaction.includes_me ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {reaction.count}
          </Text>
        </Pressable>
      ))}

      {/* Add reaction button */}
      <Pressable
        className="h-7 w-7 items-center justify-center rounded-full bg-muted"
        onPress={onAddReaction}
      >
        <FontAwesome name="smile-o" size={14} color={Colors.mutedForeground} />
      </Pressable>
    </View>
  );
}
