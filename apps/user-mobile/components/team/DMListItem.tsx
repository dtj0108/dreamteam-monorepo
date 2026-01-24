import { View, Text, Pressable, Image } from "react-native";

import {
  DirectMessageConversation,
  getMemberDisplayName,
} from "@/lib/types/team";
import { PresenceIndicator } from "./PresenceIndicator";

interface DMListItemProps {
  conversation: DirectMessageConversation;
  onPress: () => void;
}

export function DMListItem({ conversation, onPress }: DMListItemProps) {
  const participant = conversation.participant;
  const unreadCount = conversation.unread_count || 0;
  const hasUnread = unreadCount > 0;

  if (!participant) {
    return null;
  }

  return (
    <Pressable
      className="flex-row items-center px-4 py-3 active:bg-gray-100"
      onPress={onPress}
    >
      {/* Avatar with presence indicator */}
      <View className="relative">
        {participant.user.avatar_url ? (
          <Image
            source={{ uri: participant.user.avatar_url }}
            className="h-7 w-7 rounded"
          />
        ) : (
          <View className="h-7 w-7 items-center justify-center rounded bg-gray-300">
            <Text className="text-sm font-medium text-gray-600">
              {(participant.user.name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {participant.presence && (
          <View className="absolute -bottom-0.5 -right-0.5">
            <PresenceIndicator status={participant.presence.status} size="xs" />
          </View>
        )}
      </View>

      {/* Name */}
      <Text
        className={`ml-2 flex-1 text-lg ${
          hasUnread ? "font-bold text-foreground" : "text-foreground"
        }`}
        numberOfLines={1}
      >
        {getMemberDisplayName(participant)}
      </Text>

      {/* Unread Badge */}
      {hasUnread && (
        <View className="ml-2 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5">
          <Text className="text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
