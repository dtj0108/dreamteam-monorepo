import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ProductSwitcher } from "@/components/ProductSwitcher";
import { useAuth } from "@/providers/auth-provider";

import { Colors } from "@/constants/Colors";
import {
  useDMConversations,
  useWorkspaceMembers,
  useStartDMConversation,
} from "@/lib/hooks/useTeam";
import { DirectMessageConversation, WorkspaceMember } from "@/lib/types/team";
import { DMListItem } from "@/components/team/DMListItem";
import { UserListItem } from "@/components/team/UserListItem";
import { CollapsibleSection } from "@/components/team/CollapsibleSection";

export default function DMListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [showNewDMModal, setShowNewDMModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Fetch DM conversations
  const {
    data: dmsData,
    isLoading: dmsLoading,
    refetch,
  } = useDMConversations();

  // Fetch workspace members for new DM modal
  const { data: membersData, isLoading: membersLoading, refetch: refetchMembers } = useWorkspaceMembers();

  // Start DM mutation
  const startDMMutation = useStartDMConversation();

  const conversations = dmsData?.conversations || [];
  const members = membersData?.members || [];

  // Split conversations into unreads and all
  const { unreads, allConversations } = useMemo(() => {
    const unreads = conversations.filter((dm) => (dm.unread_count || 0) > 0);
    return { unreads, allConversations: conversations };
  }, [conversations]);

  // Filter members for new DM modal (exclude current user)
  const filteredMembers = useMemo(() => {
    // First filter out the current user
    const otherMembers = members.filter((m) => m.user_id !== user?.id);

    if (!memberSearchQuery) return otherMembers;
    const query = memberSearchQuery.toLowerCase();
    return otherMembers.filter(
      (m) =>
        m.user.name.toLowerCase().includes(query) ||
        m.user.email.toLowerCase().includes(query)
    );
  }, [members, memberSearchQuery, user?.id]);

  // Handlers
  const handleDMPress = (dm: DirectMessageConversation) => {
    router.push(`/(main)/team/dm/${dm.id}`);
  };

  const handleNewDM = () => {
    setShowNewDMModal(true);
    refetchMembers(); // Force refetch to clear any cached errors
  };

  const handleSelectMember = async (member: WorkspaceMember) => {
    try {
      const result = await startDMMutation.mutateAsync({
        user_id: member.user_id,
      });
      setShowNewDMModal(false);
      setMemberSearchQuery("");
      router.push(`/(main)/team/dm/${result.id}`);
    } catch (error) {
      console.error("Failed to start DM:", error);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header with ProductSwitcher */}
      <View className="px-4 py-2">
        <ProductSwitcher />
      </View>

      {dmsLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} />
          }
        >
          {/* Unreads Section */}
          {unreads.length > 0 && (
            <CollapsibleSection title="Unreads" defaultExpanded={true}>
              {unreads.map((dm) => (
                <DMListItem
                  key={dm.id}
                  conversation={dm}
                  onPress={() => handleDMPress(dm)}
                />
              ))}
            </CollapsibleSection>
          )}

          {/* All Messages Section */}
          <CollapsibleSection
            title="Direct Messages"
            defaultExpanded={true}
            rightElement={
              <Pressable onPress={handleNewDM} className="mr-2">
                <Ionicons name="add-circle-outline" size={20} color="#64748b" />
              </Pressable>
            }
          >
            {allConversations.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="chatbubble-ellipses-outline" size={48} color="#d1d5db" />
                <Text className="mt-4 text-base font-medium text-foreground">
                  No conversations yet
                </Text>
                <Text className="mt-1 text-center text-sm text-muted-foreground">
                  Start a conversation with a team member
                </Text>
                <Pressable
                  className="mt-4 flex-row items-center rounded-full bg-primary px-4 py-2 active:opacity-70"
                  onPress={handleNewDM}
                >
                  <Ionicons name="add" size={16} color="white" />
                  <Text className="ml-2 font-medium text-white">
                    New Message
                  </Text>
                </Pressable>
              </View>
            ) : (
              allConversations.map((dm) => (
                <DMListItem
                  key={dm.id}
                  conversation={dm}
                  onPress={() => handleDMPress(dm)}
                />
              ))
            )}

            {/* Add message button at bottom of list */}
            {allConversations.length > 0 && (
              <Pressable
                onPress={handleNewDM}
                className="flex-row items-center py-2"
              >
                <Ionicons name="add" size={20} color="#64748b" />
                <Text className="ml-2 text-base text-muted-foreground">
                  New message
                </Text>
              </Pressable>
            )}
          </CollapsibleSection>
        </ScrollView>
      )}

      {/* New DM Modal */}
      <Modal
        visible={showNewDMModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewDMModal(false)}
      >
        <SafeAreaView className="flex-1 bg-background">
          {/* Modal Header */}
          <View className="flex-row items-center border-b border-border px-4 py-3">
            <Pressable
              className="mr-3 h-8 w-8 items-center justify-center rounded-full active:bg-muted"
              onPress={() => {
                setShowNewDMModal(false);
                setMemberSearchQuery("");
              }}
            >
              <Ionicons name="close" size={22} color="#0f172a" />
            </Pressable>
            <Text className="flex-1 text-lg font-semibold text-foreground">
              New Message
            </Text>
          </View>

          {/* Member Search */}
          <View className="px-4 py-3">
            <View className="flex-row items-center rounded-lg bg-muted px-3 py-2">
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                className="ml-2 flex-1 text-foreground"
                placeholder="Search team members..."
                placeholderTextColor="#9ca3af"
                value={memberSearchQuery}
                onChangeText={setMemberSearchQuery}
                autoFocus
              />
              {memberSearchQuery.length > 0 && (
                <Pressable onPress={() => setMemberSearchQuery("")}>
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
                    {memberSearchQuery ? "Results" : "Suggested"}
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
                    No team members yet
                  </Text>
                  <Text className="mt-1 text-center text-sm text-muted-foreground">
                    Invite team members from the web app to start messaging
                  </Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
