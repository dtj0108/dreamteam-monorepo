import { View, Text, Pressable, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { WorkspaceMember, getMemberDisplayName } from "@/lib/types/team";
import { PresenceIndicator } from "./PresenceIndicator";

interface UserListItemProps {
  member: WorkspaceMember;
  onPress: () => void;
  selected?: boolean;
}

export function UserListItem({
  member,
  onPress,
  selected = false,
}: UserListItemProps) {
  return (
    <Pressable
      className={`mb-2 flex-row items-center rounded-xl p-3 ${
        selected ? "bg-primary/10" : "bg-muted"
      } active:opacity-70`}
      onPress={onPress}
    >
      {/* Avatar with presence */}
      <View className="relative">
        {member.user.avatar_url ? (
          <Image
            source={{ uri: member.user.avatar_url }}
            className="h-10 w-10 rounded-full"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
            <FontAwesome name="user" size={16} color={Colors.mutedForeground} />
          </View>
        )}
        {member.presence && (
          <View className="absolute -bottom-0.5 -right-0.5">
            <PresenceIndicator status={member.presence.status} size="sm" />
          </View>
        )}
      </View>

      {/* Content */}
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-foreground">
          {getMemberDisplayName(member)}
        </Text>
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {member.title || member.user.email}
        </Text>
      </View>

      {/* Selected indicator or chevron */}
      {selected ? (
        <FontAwesome name="check-circle" size={20} color={Colors.primary} />
      ) : (
        <FontAwesome
          name="chevron-right"
          size={12}
          color={Colors.mutedForeground}
        />
      )}
    </Pressable>
  );
}
