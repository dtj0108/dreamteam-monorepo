import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { ChannelWithMembership } from "@/lib/types/team";

interface ChannelListItemProps {
  channel: ChannelWithMembership;
  onPress: () => void;
}

export function ChannelListItem({ channel, onPress }: ChannelListItemProps) {
  const isPrivate = channel.type === "private";
  const unreadCount = channel.unread_count || 0;
  const hasUnread = unreadCount > 0;

  return (
    <Pressable
      className="flex-row items-center px-4 py-3 active:bg-gray-100"
      onPress={onPress}
    >
      {/* Channel Icon */}
      {isPrivate ? (
        <Ionicons name="lock-closed" size={18} color="#64748b" />
      ) : (
        <Text className="text-lg text-gray-500">#</Text>
      )}

      {/* Channel Name */}
      <Text
        className={`ml-2 flex-1 text-lg ${
          hasUnread ? "font-bold text-foreground" : "text-foreground"
        }`}
        numberOfLines={1}
      >
        {channel.name}
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
