import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Channel } from "@/lib/types/team";

interface ChannelHeaderProps {
  channel: Channel;
  memberCount: number;
  onBack: () => void;
  onMembersPress: () => void;
  onSettingsPress: () => void;
  onHuddlePress?: () => void;
}

export function ChannelHeader({
  channel,
  memberCount,
  onBack,
  onMembersPress,
  onSettingsPress,
  onHuddlePress,
}: ChannelHeaderProps) {
  const isPrivate = channel.type === "private";

  return (
    <View className="border-b border-border bg-background">
      <View className="flex-row items-center px-4 py-3">
        {/* Back Button */}
        <Pressable
          className="mr-3 h-8 w-8 items-center justify-center rounded-full active:bg-muted"
          onPress={onBack}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </Pressable>

        {/* Channel Icon + Info */}
        <Pressable className="flex-1 flex-row items-center" onPress={onMembersPress}>
          {/* Channel Icon */}
          <View className="mr-2">
            {isPrivate ? (
              <Ionicons name="lock-closed" size={18} color="#64748b" />
            ) : (
              <Text className="text-lg font-bold text-gray-500">#</Text>
            )}
          </View>

          {/* Channel Name + Member Count */}
          <View>
            <Text className="text-base font-semibold text-foreground">
              {channel.name}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </Pressable>

        {/* Action Icons */}
        <View className="flex-row items-center gap-1">
          {/* Settings/Filter */}
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full active:bg-muted"
            onPress={onSettingsPress}
          >
            <Ionicons name="options-outline" size={22} color="#64748b" />
          </Pressable>

          {/* Huddle */}
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full active:bg-muted"
            onPress={onHuddlePress}
          >
            <Ionicons name="headset-outline" size={22} color="#64748b" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
