import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/providers/auth-provider";
import {
  useWorkspaceMembers,
  useStartDMConversation,
} from "@/lib/hooks/useTeam";
import { WorkspaceMember } from "@/lib/types/team";
import { UserListItem } from "@/components/team/UserListItem";

export default function NewDMScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch workspace members
  const { data: membersData, isLoading: membersLoading } = useWorkspaceMembers();

  // Start DM mutation
  const startDMMutation = useStartDMConversation();

  const members = membersData?.members || [];

  // Filter members (exclude current user)
  const filteredMembers = useMemo(() => {
    const otherMembers = members.filter((m) => m.user_id !== user?.id);

    if (!searchQuery) return otherMembers;
    const query = searchQuery.toLowerCase();
    return otherMembers.filter(
      (m) =>
        m.user.name.toLowerCase().includes(query) ||
        m.user.email.toLowerCase().includes(query)
    );
  }, [members, searchQuery, user?.id]);

  // Handlers
  const handleBack = () => {
    router.back();
  };

  const handleSelectMember = async (member: WorkspaceMember) => {
    try {
      const result = await startDMMutation.mutateAsync({
        user_id: member.user_id,
      });
      router.replace(`/(main)/team/dm/${result.id}`);
    } catch (error) {
      console.error("Failed to start DM:", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center border-b border-border px-4 py-3">
        <Pressable
          className="mr-3 h-8 w-8 items-center justify-center rounded-full active:bg-muted"
          onPress={handleBack}
        >
          <Ionicons name="close" size={22} color="#0f172a" />
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-foreground">
          New Message
        </Text>
      </View>

      {/* Search */}
      <View className="px-4 py-3">
        <View className="flex-row items-center rounded-lg bg-muted px-3 py-2">
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            className="ml-2 flex-1 text-foreground"
            placeholder="Search team members..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Member List */}
      {membersLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ListHeaderComponent={
            filteredMembers.length > 0 ? (
              <Text className="mb-2 text-sm font-medium text-muted-foreground">
                {searchQuery ? "Results" : "Suggested"}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <UserListItem
              member={item}
              onPress={() => handleSelectMember(item)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Ionicons name="people-outline" size={48} color="#d1d5db" />
              <Text className="mt-4 text-base font-medium text-foreground">
                No team members found
              </Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "Invite team members from the web app to start messaging"}
              </Text>
            </View>
          }
        />
      )}

      {/* Loading overlay when creating DM */}
      {startDMMutation.isPending && (
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <View className="rounded-lg bg-white p-4">
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text className="mt-2 text-sm text-foreground">Starting conversation...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
