import { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { WorkspaceMember, getMemberDisplayName } from "@/lib/types/team";

interface MentionAutocompleteProps {
  query: string;
  members: WorkspaceMember[];
  isLoading: boolean;
  onSelect: (member: WorkspaceMember) => void;
  onClose: () => void;
  visible: boolean;
}

export function MentionAutocomplete({
  query,
  members,
  isLoading,
  onSelect,
  onClose,
  visible,
}: MentionAutocompleteProps) {
  // Filter members based on query
  const filteredMembers = query.length === 0
    ? members.slice(0, 5) // Show first 5 when no query
    : members.filter((member) => {
        const searchQuery = query.toLowerCase();
        const displayName = getMemberDisplayName(member).toLowerCase();
        const email = member.user.email.toLowerCase();
        const name = member.user.name.toLowerCase();

        return (
          displayName.includes(searchQuery) ||
          email.includes(searchQuery) ||
          name.includes(searchQuery)
        );
      }).slice(0, 8); // Limit to 8 results

  // Close on keyboard dismiss
  useEffect(() => {
    if (Platform.OS !== "web") {
      const subscription = Keyboard.addListener("keyboardDidHide", onClose);
      return () => subscription.remove();
    }
  }, [onClose]);

  const handleSelect = useCallback(
    (member: WorkspaceMember) => {
      onSelect(member);
    },
    [onSelect]
  );

  if (!visible) return null;

  if (isLoading) {
    return (
      <View className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-white shadow-lg border border-gray-200">
        <View className="p-4 items-center">
          <Text className="text-sm text-muted-foreground">Loading members...</Text>
        </View>
      </View>
    );
  }

  if (filteredMembers.length === 0) {
    return (
      <View className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-white shadow-lg border border-gray-200">
        <View className="p-4 items-center">
          <Text className="text-sm text-muted-foreground">No members found</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-white shadow-lg border border-gray-200 max-h-64 overflow-hidden">
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.user_id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <MentionItem member={item} onSelect={handleSelect} />
        )}
        ItemSeparatorComponent={() => (
          <View className="h-px bg-gray-100 mx-3" />
        )}
      />
    </View>
  );
}

interface MentionItemProps {
  member: WorkspaceMember;
  onSelect: (member: WorkspaceMember) => void;
}

function MentionItem({ member, onSelect }: MentionItemProps) {
  const displayName = getMemberDisplayName(member);

  return (
    <Pressable
      className="flex-row items-center px-3 py-2.5 active:bg-gray-50"
      onPress={() => onSelect(member)}
    >
      {/* Avatar */}
      <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted mr-3">
        {member.user.avatar_url ? (
          <Image
            source={{ uri: member.user.avatar_url }}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <Text className="text-sm font-semibold text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      {/* Name and email */}
      <View className="flex-1">
        <Text className="font-medium text-foreground" numberOfLines={1}>
          {displayName}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {member.user.email}
        </Text>
      </View>

      {/* Role badge */}
      {member.role !== "member" && (
        <View className="ml-2 rounded bg-gray-100 px-1.5 py-0.5">
          <Text className="text-xs font-medium text-gray-600 capitalize">
            {member.role}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
